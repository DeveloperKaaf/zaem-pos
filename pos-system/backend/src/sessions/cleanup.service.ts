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
    try {
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
        // نستخدم التقريب لضمان اكتشاف الدقيقة الخامسة
        if (remainingMin === 5 && !this.warnedSessions.has(session.id)) {
          if (session.resource.tuyaDeviceId) {
            const switchCode = session.resource.tuyaSwitchCode || 'switch_1';
            this.logger.log(`[Flash Warning] Starting for Session: ${session.id}, Switch: ${switchCode}`);

            try {
              // خطوة 1: إطفاء المفتاح المحدد فقط
              await this.tuyaService.controlDevice(session.resource.tuyaDeviceId, false, switchCode);

              // خطوة 2: تشغيل بعد 1.2 ثانية لضمان استقرار الهاردوير
              setTimeout(async () => {
                // نتحقق أن الجلسة لا تزال نشطة قبل إعادة التشغيل
                const sessionStatus = await this.prisma.session.findUnique({ where: { id: session.id } });
                if (sessionStatus && sessionStatus.status === 'ACTIVE') {
                  await this.tuyaService.controlDevice(session.resource.tuyaDeviceId, true, switchCode);
                  this.logger.log(`[Flash Warning] Completed for Session: ${session.id}`);
                }
              }, 1200);

              this.warnedSessions.add(session.id);
            } catch (e) {
              this.logger.error(`Flash failed for session ${session.id}: ${e.message}`);
            }
          }
        }

        // 2. إغلاق الجلسة إذا انتهى الوقت
        if (remainingMs <= 0) {
          this.logger.log(`Auto-closing session: ${session.id}`);
          // نمرر undefined كـ userId ليدل على أن الإغلاق تم آلياً بواسطة النظام
          await this.sessionsService.stopSession(session.id, undefined);
          this.warnedSessions.delete(session.id);
        }
      }
    } catch (error) {
      this.logger.error('Error in CleanupService:', error);
    }
  }
}
