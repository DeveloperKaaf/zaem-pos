import { Injectable, NotFoundException } from '@nestjs/common';
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

    if (!resource) throw new NotFoundException('Resource not found');
    if (resource.status !== 'AVAILABLE') throw new Error('Resource is not available');

    let initialPrice = 0;
    if (durationMin > 0) {
      const priceConfig = resource.prices.find((p) => p.durationMin === durationMin);
      if (!priceConfig) throw new Error('Price configuration not found');
      initialPrice = priceConfig.price;
    }

    if (resource.tuyaDeviceId) {
      await this.tuyaService.controlDevice(resource.tuyaDeviceId, true);
    }

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

    await this.logsService.createLog(userId, 'START_SESSION', `بدء جلسة لـ ${resource.name}. المبلغ المدفوع: ${initialPrice}`);

    if (durationMin > 0) {
      setTimeout(() => {
        this.stopSession(session.id, 'SYSTEM');
      }, durationMin * 60 * 1000);
    }

    this.eventEmitter.emit('session.updated', session);
    return session;
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
      await this.tuyaService.controlDevice(session.resource.tuyaDeviceId, false);
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
