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

  async startSession(resourceId: string, durationMin: number, userId: string) {
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
        await this.tuyaService.controlDevice(resource.tuyaDeviceId, true);
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

        await tx.invoice.create({
          data: {
            sessionId: newSession.id,
            timeAmount: initialPrice,
            itemsAmount: 0,
            totalAmount: initialPrice,
            isPaid: durationMin > 0,
            paymentDate: durationMin > 0 ? new Date() : null,
            items: []
          },
        });

        return newSession;
      });

      await this.logsService.createLog(userId, 'START_SESSION', `بدء جلسة لـ ${resource.name}. المبلغ: ${initialPrice}`);

      // إعداد تنبيه الـ 5 دقائق (وميض الإضاءة)
      if (durationMin > 5) {
        const warningTime = (durationMin - 5) * 60 * 1000;
        setTimeout(async () => {
          if (resource.tuyaDeviceId) {
            console.log(`Warning flash for ${resource.name}`);
            await this.tuyaService.controlDevice(resource.tuyaDeviceId, false);
            setTimeout(() => this.tuyaService.controlDevice(resource.tuyaDeviceId, true), 500);
          }
        }, warningTime);
      }

      // إعداد إغلاق الجلسة التلقائي
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

  async extendSession(sessionId: string, extraMin: number, userId: string) {
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
      await tx.invoice.update({
        where: { sessionId: sessionId },
        data: {
          timeAmount: { increment: extraPrice },
          totalAmount: { increment: extraPrice }
        }
      });
      return sess;
    });

    this.eventEmitter.emit('session.updated', updatedSession);
    return updatedSession;
  }

  async stopSession(sessionId: string, userId?: string) {
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
        await this.tuyaService.controlDevice(session.resource.tuyaDeviceId, false);
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

      await tx.invoice.update({
        where: { sessionId: sessionId },
        data: {
            timeAmount: finalTimeAmount,
            totalAmount: finalTotal
        },
      });
    });

    this.eventEmitter.emit('session.updated', { ...session, status: 'COMPLETED' });
  }
}
