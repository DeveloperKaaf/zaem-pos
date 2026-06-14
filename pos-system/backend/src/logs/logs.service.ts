import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class LogsService {
  constructor(private prisma: PrismaService) {}

  async createLog(userId: string | undefined, action: string, details?: string) {
    // إذا كان userId غير موجود أو هو 'SYSTEM'، نقوم بتخزينه كـ null
    // قاعدة البيانات تسمح بـ null في هذا الحقل، وهذا سيمنع خطأ الـ Foreign Key
    const finalUserId = (userId === 'SYSTEM' || !userId) ? null : userId;

    return this.prisma.actionLog.create({
      data: {
        userId: finalUserId,
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
