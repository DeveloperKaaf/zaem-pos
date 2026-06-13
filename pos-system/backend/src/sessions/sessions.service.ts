import { Injectable, NotFoundException, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TuyaService } from '../tuya/tuya.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { LogsService } from '../logs/logs.service';

@Injectable()
export class SessionsService {
  constructor(
    private prisma: PrismaService,
    private tuyaService: TuyaService,
    private eventEmitter: EventEmitter2,
    private logsService: LogsService,
  ) {}

  async startSession(resourceId: string, durationMin: number, userId: string, paymentMethod?: string, splitData?: { cash: number, net: number }) {
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

    if (resource.tuyaDeviceId) {
      try {
        await this.tuyaService.controlDevice(resource.tuyaDeviceId, true, resource.tuyaSwitchCode);
      } catch (e) {
        console.error('Tuya Error:', e.message);
      }
    }

    try {
      const session = await this.prisma.$transaction(async (tx) => {
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
          totalAmount: initialPrice,
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
              invoiceData.cashAmount = initialPrice;
           } else if (paymentMethod === 'NET') {
              invoiceData.netAmount = initialPrice;
           }
        }

        await tx.invoice.create({ data: invoiceData });

        return newSession;
      });

      let logMsg = `بدء جلسة لـ ${resource.name}. المبلغ: ${initialPrice}`;
      if (paymentMethod === 'SPLIT' && splitData) {
          logMsg += ` (تقسيم: كاش ${splitData.cash} - شبكة ${splitData.net})`;
      } else {
          logMsg += ` (${paymentMethod === 'NET' ? 'شبكة' : 'كاش'})`;
      }
      await this.logsService.createLog(userId, 'START_SESSION', logMsg);

      if (durationMin > 5) {
        const warningTime = (durationMin - 5) * 60 * 1000;
        setTimeout(async () => {
          if (resource.tuyaDeviceId) {
            await this.tuyaService.controlDevice(resource.tuyaDeviceId, false, resource.tuyaSwitchCode);
            setTimeout(() => this.tuyaService.controlDevice(resource.tuyaDeviceId, true, resource.tuyaSwitchCode), 500);
          }
        }, warningTime);
      }

      if (durationMin > 0) {
        setTimeout(() => {
          this.stopSession(session.id, 'SYSTEM');
        }, durationMin * 60 * 1000);
      }

      this.eventEmitter.emit('session.updated', session);
      return session;
    } catch (error) {
      console.error('Prisma Error:', error);
      throw new InternalServerErrorException('فشل في حفظ الجلسة.');
    }
  }

  async extendSession(sessionId: string, extraMin: number, userId: string, paymentMethod?: string, splitData?: { cash: number, net: number }) {
    const session = await this.prisma.session.findUnique({
      where: { id: sessionId },
      include: { resource: { include: { prices: true } }, invoice: true }
    });

    if (!session || session.status !== 'ACTIVE') {
      throw new BadRequestException('الجلسة غير نشطة');
    }

    const priceConfig = session.resource.prices.find(p => p.durationMin === extraMin);
    const extraPrice = priceConfig?.price || 0;

    const updatedSession = await this.prisma.$transaction(async (tx) => {
      const newDuration = session.durationMin + extraMin;
      const sess = await tx.session.update({
        where: { id: sessionId },
        data: { durationMin: newDuration }
      });

      const invoiceUpdate: any = {
        timeAmount: { increment: extraPrice },
        totalAmount: { increment: extraPrice },
        paymentMethod: paymentMethod || session.invoice.paymentMethod || 'CASH'
      };

      if (paymentMethod === 'SPLIT' && splitData) {
          invoiceUpdate.cashAmount = { increment: splitData.cash };
          invoiceUpdate.netAmount = { increment: splitData.net };
      } else if (paymentMethod === 'CASH') {
          invoiceUpdate.cashAmount = { increment: extraPrice };
      } else if (paymentMethod === 'NET') {
          invoiceUpdate.netAmount = { increment: extraPrice };
      }

      await tx.invoice.update({
        where: { sessionId: sessionId },
        data: invoiceUpdate
      });
      return sess;
    });

    let logMsg = `تمديد جلسة لـ ${session.resource.name} بمقدار ${extraMin} دقيقة. المبلغ: ${extraPrice}`;
    if (paymentMethod === 'SPLIT' && splitData) {
        logMsg += ` (تقسيم: كاش ${splitData.cash} - شبكة ${splitData.net})`;
    } else {
        logMsg += ` (${paymentMethod === 'NET' ? 'شبكة' : 'كاش'})`;
    }
    await this.logsService.createLog(userId, 'EXTEND_SESSION', logMsg);

    this.eventEmitter.emit('session.updated', updatedSession);
    return updatedSession;
  }

  async stopSession(sessionId: string, userId?: string, paymentMethod: string = 'CASH', splitData?: { cash: number, net: number }) {
    const session = await this.prisma.session.findUnique({
      where: { id: sessionId },
      include: { resource: true, invoice: true },
    });

    if (!session || session.status !== 'ACTIVE') return;

    let finalTimeAmount = session.invoice.timeAmount;

    if (session.durationMin === 0) {
      const now = new Date();
      const diffMs = now.getTime() - session.startTime.getTime();
      const diffMin = Math.ceil(diffMs / (60 * 1000));
      finalTimeAmount = diffMin * 0.5;
    }

    if (session.resource.tuyaDeviceId) {
      try {
        await this.tuyaService.controlDevice(session.resource.tuyaDeviceId, false, session.resource.tuyaSwitchCode);
      } catch (e) {
        console.error('Tuya Stop Error:', e.message);
      }
    }

    const finalTotal = finalTimeAmount + session.invoice.itemsAmount;

    await this.prisma.$transaction(async (tx) => {
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

      await tx.invoice.update({
        where: { sessionId: sessionId },
        data: invoiceUpdate,
      });
    });

    let logMsg = `إنهاء جلسة لـ ${session.resource.name}. الإجمالي: ${finalTotal}`;
    if (paymentMethod === 'SPLIT' && splitData) {
        logMsg += ` (تقسيم: كاش ${splitData.cash} - شبكة ${splitData.net})`;
    } else {
        logMsg += ` (${paymentMethod === 'NET' ? 'شبكة' : 'كاش'})`;
    }
    await this.logsService.createLog(userId || 'SYSTEM', 'STOP_SESSION', logMsg);

    this.eventEmitter.emit('session.updated', { ...session, status: 'COMPLETED' });
  }
}
