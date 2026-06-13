import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class LogsService {
  constructor(private prisma: PrismaService) {}

  async createLog(userId: string, action: string, details?: string) {
    return this.prisma.actionLog.create({
      data: {
        userId,
        action,
        details,
      },
    });
  }

  async getAllLogs() {
    return this.prisma.actionLog.findMany({
      include: {
        user: { select: { name: true, role: true } },
      },
      orderBy: { timestamp: 'desc' },
      take: 100,
    });
  }
}
