import { Injectable, NotFoundException, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TuyaService } from '../tuya/tuya.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { LogsService } from '../logs/logs.service';

@Injectable()
export class SessionsService {
  // Map to keep track of active timeouts for each session
  private sessionTimeouts = new Map<string, { warning?: NodeJS.Timeout, stop?: NodeJS.Timeout }>();

  constructor(
    private prisma: PrismaService,
    private tuyaService: TuyaService,
    private eventEmitter: EventEmitter2,
    private logsService: LogsService,
  ) {}

  private clearSessionTimeouts(sessionId: string) {
    const timeouts = this.sessionTimeouts.get(sessionId);
    if (timeouts) {
      if (timeouts.warning) clearTimeout(timeouts.warning);
      if (timeouts.stop) clearTimeout(timeouts.stop);
      this.sessionTimeouts.delete(sessionId);
    }
  }

  async startSession(
    resourceId: string,
    durationMin: number,
    userId: string,
    paymentMethod?: string,
    splitData?: { cash: number, net: number },
    discountData?: { amount: number, type: 'FIXED' | 'PERCENT' }
  ) {
    const resource = await this.prisma.resource.findUnique({
      where: { id: resourceId },
      include: { prices: true },
    });

    if (!resource) throw new NotFoundException('الجهاز غير موجود');
    if (resource.status !== 'AVAILABLE') throw new BadRequestException('الجهاز مشغول حالياً');

    let initialPrice = 0;
    if (durationMin > 0) {
      const priceConfig = resource.prices.find((p) => p.durationMin === durationMin);
      if (!priceConfig) throw new BadRequestException('إعدادات السعر لهذا الوقت غير موجودة');
      initialPrice = priceConfig.price;
    }

    // حساب الخصم
    let discountValue = 0;
    if (discountData && discountData.amount > 0) {
      if (discountData.type === 'PERCENT') {
        discountValue = initialPrice * (discountData.amount / 100);
      } else {
        discountValue = discountData.amount;
      }
    }
    const finalTotal = Math.max(0, initialPrice - discountValue);

    if (resource.tuyaDeviceId) {
      try {
        await this.tuyaService.controlDevice(resource.tuyaDeviceId, true, resource.tuyaSwitchCode);
      } catch (e) {
        console.error('Tuya Error:', e.message);
      }
    }

    try {
      const result = await this.prisma.$transaction(async (tx) => {
        const newSession = await tx.session.create({
          data: {
            resourceId,
            userId,
            durationMin,
            status: 'ACTIVE',
          },
        });

        await tx.resource.update({
          where: { id: resourceId },
          data: { status: 'OCCUPIED' },
        });

        const invoiceData: any = {
          sessionId: newSession.id,
          timeAmount: initialPrice,
          itemsAmount: 0,
          discount: discountData?.amount || 0,
          discountType: discountData?.type || 'FIXED',
          totalAmount: finalTotal,
          isPaid: durationMin > 0,
          paymentDate: durationMin > 0 ? new Date() : null,
          paymentMethod: durationMin > 0 ? (paymentMethod || 'CASH') : null,
          items: []
        };

        if (durationMin > 0) {
           if (paymentMethod === 'SPLIT' && splitData) {
              invoiceData.cashAmount = splitData.cash;
              invoiceData.netAmount = splitData.net;
           } else if (paymentMethod === 'CASH') {
              invoiceData.cashAmount = finalTotal;
           } else if (paymentMethod === 'NET') {
              invoiceData.netAmount = finalTotal;
           }
        }

        const invoice = await tx.invoice.create({
          data: invoiceData,
          include: {
            session: {
              include: {
                resource: true,
                user: { select: { name: true } }
              }
            }
          }
        });

        return { session: newSession, invoice };
      });

      let logMsg = `بدء جلسة لـ ${resource.name}. المبلغ: ${initialPrice}`;
      if (discountValue > 0) logMsg += ` (خصم: ${discountValue})`;

      if (paymentMethod === 'SPLIT' && splitData) {
          logMsg += ` (تقسيم: كاش ${splitData.cash} - شبكة ${splitData.net})`;
      } else {
          logMsg += ` (${paymentMethod === 'NET' ? 'شبكة' : 'كاش'})`;
      }
      await this.logsService.createLog(userId, 'START_SESSION', logMsg);

      // Handle Timers
      const timeouts: { warning?: NodeJS.Timeout, stop?: NodeJS.Timeout } = {};

      // ملاحظة: تم تعطيل الوميض هنا لأنه يتم معالجته بشكل أكثر دقة في CleanupService
      /*
      if (durationMin > 5) {
        const warningTime = (durationMin - 5) * 60 * 1000;
        timeouts.warning = setTimeout(async () => {
          const currentSession = await this.prisma.session.findUnique({ where: { id: result.session.id } });
          if (currentSession && currentSession.status === 'ACTIVE' && resource.tuyaDeviceId) {
            await this.tuyaService.controlDevice(resource.tuyaDeviceId, false, resource.tuyaSwitchCode);
            setTimeout(() => this.tuyaService.controlDevice(resource.tuyaDeviceId, true, resource.tuyaSwitchCode), 1200);
          }
        }, warningTime);
      }
      */

      if (durationMin > 0) {
        timeouts.stop = setTimeout(() => {
          this.stopSession(result.session.id, undefined, 'SYSTEM');
        }, durationMin * 60 * 1000);
      }
      if (timeouts.warning || timeouts.stop) {
        this.sessionTimeouts.set(result.session.id, timeouts);
      }

      this.eventEmitter.emit('session.updated', result.session);
      return result.invoice;
    } catch (error) {
      console.error('Prisma Error:', error);
      throw new InternalServerErrorException('فشل في حفظ الجلسة.');
    }
  }

  async extendSession(
    sessionId: string,
    extraMin: number,
    userId: string,
    paymentMethod?: string,
    splitData?: { cash: number, net: number },
    discountData?: { amount: number, type: 'FIXED' | 'PERCENT' }
  ) {
    const session = await this.prisma.session.findUnique({
      where: { id: sessionId },
      include: { resource: { include: { prices: true } }, invoice: true }
    });

    if (!session || session.status !== 'ACTIVE') {
      throw new BadRequestException('الجلسة غير نشطة');
    }

    const priceConfig = session.resource.prices.find(p => p.durationMin === extraMin);
    const extraPrice = priceConfig?.price || 0;

    // حساب الخصم للإضافة الجديدة (تمديد)
    let discountValue = 0;
    if (discountData && discountData.amount > 0) {
      if (discountData.type === 'PERCENT') {
        discountValue = extraPrice * (discountData.amount / 100);
      } else {
        discountValue = discountData.amount;
      }
    }
    const finalExtra = Math.max(0, extraPrice - discountValue);

    const updatedInvoice = await this.prisma.$transaction(async (tx) => {
      const newDuration = session.durationMin + extraMin;
      await tx.session.update({
        where: { id: sessionId },
        data: { durationMin: newDuration }
      });

      const invoiceUpdate: any = {
        timeAmount: { increment: extraPrice },
        discount: { increment: discountData?.amount || 0 },
        totalAmount: { increment: finalExtra },
        paymentMethod: paymentMethod || session.invoice.paymentMethod || 'CASH'
      };

      if (paymentMethod === 'SPLIT' && splitData) {
          invoiceUpdate.cashAmount = { increment: splitData.cash };
          invoiceUpdate.netAmount = { increment: splitData.net };
      } else if (paymentMethod === 'CASH') {
          invoiceUpdate.cashAmount = { increment: finalExtra };
      } else if (paymentMethod === 'NET') {
          invoiceUpdate.netAmount = { increment: finalExtra };
      }

      return tx.invoice.update({
        where: { sessionId: sessionId },
        data: invoiceUpdate,
        include: {
          session: {
            include: {
              resource: true,
              user: { select: { name: true } }
            }
          }
        }
      });
    });

    this.clearSessionTimeouts(sessionId);
    const remainingMs = ( (session.durationMin + extraMin) * 60 * 1000) - (Date.now() - session.startTime.getTime());

    if (remainingMs > 0) {
      const timeouts: { warning?: NodeJS.Timeout, stop?: NodeJS.Timeout } = {};
      timeouts.stop = setTimeout(() => { this.stopSession(sessionId, undefined, 'SYSTEM'); }, remainingMs);

      /* تم تعطيل الوميض هنا أيضاً لمنع التكرار
      const warningRemainingMs = remainingMs - (5 * 60 * 1000);
      if (warningRemainingMs > 0) {
        timeouts.warning = setTimeout(async () => {
          const current = await this.prisma.session.findUnique({ where: { id: sessionId } });
          if (current && current.status === 'ACTIVE' && session.resource.tuyaDeviceId) {
            await this.tuyaService.controlDevice(session.resource.tuyaDeviceId, false, session.resource.tuyaSwitchCode);
            setTimeout(() => this.tuyaService.controlDevice(session.resource.tuyaDeviceId, true, session.resource.tuyaSwitchCode), 1200);
          }
        }, warningRemainingMs);
      }
      */
      this.sessionTimeouts.set(sessionId, timeouts);
    }

    let logMsg = `تمديد جلسة لـ ${session.resource.name} بمقدار ${extraMin} دقيقة.`;
    await this.logsService.createLog(userId, 'EXTEND_SESSION', logMsg);

    this.eventEmitter.emit('session.updated', { id: sessionId });
    return updatedInvoice;
  }

  async stopSession(
    sessionId: string,
    userId?: string,
    paymentMethod: string = 'CASH',
    splitData?: { cash: number, net: number },
    discountData?: { amount: number, type: 'FIXED' | 'PERCENT' }
  ) {
    this.clearSessionTimeouts(sessionId);
    const session = await this.prisma.session.findUnique({
      where: { id: sessionId },
      include: { resource: { include: { prices: true } }, invoice: true },
    });

    if (!session || session.status !== 'ACTIVE') return;

    let finalTimeAmount = session.invoice.timeAmount;
    if (session.durationMin === 0) {
      const now = new Date();
      const diffMs = now.getTime() - session.startTime.getTime();
      const diffMin = Math.ceil(diffMs / (60 * 1000));

      const openPrice = session.resource.prices.find(p => p.durationMin === 0)?.price || 0.5;
      finalTimeAmount = diffMin * openPrice;
    }

    if (session.resource.tuyaDeviceId) {
      try {
        await this.tuyaService.controlDevice(session.resource.tuyaDeviceId, false, session.resource.tuyaSwitchCode);
      } catch (e) {
        console.error('Tuya Stop Error:', e.message);
      }
    }

    const subtotal = finalTimeAmount + session.invoice.itemsAmount;
    let discountValue = 0;
    if (discountData && discountData.amount > 0) {
      if (discountData.type === 'PERCENT') {
        discountValue = subtotal * (discountData.amount / 100);
      } else {
        discountValue = discountData.amount;
      }
    }
    const finalTotal = Math.max(0, subtotal - discountValue);

    const resultInvoice = await this.prisma.$transaction(async (tx) => {
      await tx.session.update({
        where: { id: sessionId },
        data: { status: 'COMPLETED', endTime: new Date() },
      });

      await tx.resource.update({
        where: { id: session.resourceId },
        data: { status: 'AVAILABLE' },
      });

      const invoiceUpdate: any = {
        timeAmount: finalTimeAmount,
        discount: discountData?.amount || 0,
        discountType: discountData?.type || 'FIXED',
        totalAmount: finalTotal,
        isPaid: true,
        paymentDate: new Date(),
        paymentMethod: paymentMethod
      };

      if (paymentMethod === 'SPLIT' && splitData) {
          invoiceUpdate.cashAmount = splitData.cash;
          invoiceUpdate.netAmount = splitData.net;
      } else if (paymentMethod === 'CASH') {
          invoiceUpdate.cashAmount = finalTotal;
          invoiceUpdate.netAmount = 0;
      } else if (paymentMethod === 'NET') {
          invoiceUpdate.netAmount = finalTotal;
          invoiceUpdate.cashAmount = 0;
      }

      return tx.invoice.update({
        where: { sessionId: sessionId },
        data: invoiceUpdate,
        include: {
          session: {
            include: {
              resource: true,
              user: { select: { name: true } }
            }
          }
        }
      });
    });

    let logMsg = `إنهاء جلسة لـ ${session.resource.name}. الإجمالي: ${finalTotal}`;
    // نمرر الـ userId كما هو، فإذا كان undefined سيتم تخزينه كـ null في قاعدة البيانات وهو مسموح به
    await this.logsService.createLog(userId, 'STOP_SESSION', logMsg);

    this.eventEmitter.emit('session.updated', { ...session, status: 'COMPLETED' });
    return resultInvoice;
  }
}
