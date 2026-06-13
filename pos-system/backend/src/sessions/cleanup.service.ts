import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SessionsService } from './sessions.service';

@Injectable()
export class CleanupService {
  private readonly logger = new Logger(CleanupService.name);

  constructor(
    private prisma: PrismaService,
    private sessionsService: SessionsService,
  ) {
    // تشغيل فحص كل دقيقة للتأكد من الجلسات المنتهية
    setInterval(() => this.checkExpiredSessions(), 60000);
  }

  async checkExpiredSessions() {
    const activeSessions = await this.prisma.session.findMany({
      where: {
        status: 'ACTIVE',
        durationMin: { gt: 0 } // فقط الوقت المحدد
      },
    });

    const now = new Date().getTime();

    for (const session of activeSessions) {
      const endTime = new Date(session.startTime).getTime() + (session.durationMin * 60000);
      if (now >= endTime) {
        this.logger.log(`Auto-closing expired session: ${session.id}`);
        await this.sessionsService.stopSession(session.id, 'SYSTEM_AUTO');
      }
    }
  }
}
