import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SessionsService } from './sessions.service';
import { TuyaService } from '../tuya/tuya.service';

@Injectable()
export class CleanupService {
  private readonly logger = new Logger(CleanupService.name);
  private warnedSessions = new Set<string>(); // لتجنب تكرار الوميض لنفس الجلسة

  constructor(
    private prisma: PrismaService,
    private sessionsService: SessionsService,
    private tuyaService: TuyaService,
  ) {
    // فحص كل دقيقة
    setInterval(() => this.checkSessions(), 60000);
  }

  async checkSessions() {
    const activeSessions = await this.prisma.session.findMany({
      where: { status: 'ACTIVE', durationMin: { gt: 0 } },
      include: { resource: true }
    });

    const now = new Date().getTime();

    for (const session of activeSessions) {
      const endTime = new Date(session.startTime).getTime() + (session.durationMin * 60000);
      const remainingMs = endTime - now;
      const remainingMin = Math.round(remainingMs / 60000);

      // 1. ميزة الوميض قبل 5 دقائق
      if (remainingMin === 5 && !this.warnedSessions.has(session.id)) {
        if (session.resource.tuyaDeviceId) {
          this.logger.log(`Warning flash for session ${session.id}`);
          try {
            await this.tuyaService.controlDevice(session.resource.tuyaDeviceId, false);
            setTimeout(() => this.tuyaService.controlDevice(session.resource.tuyaDeviceId, true), 500);
            this.warnedSessions.add(session.id);
          } catch (e) {
            this.logger.error(`Flash failed: ${e.message}`);
          }
        }
      }

      // 2. إغلاق الجلسة إذا انتهى الوقت
      if (remainingMs <= 0) {
        this.logger.log(`Auto-closing session: ${session.id}`);
        await this.sessionsService.stopSession(session.id, 'SYSTEM_AUTO');
        this.warnedSessions.delete(session.id);
      }
    }
  }
}
