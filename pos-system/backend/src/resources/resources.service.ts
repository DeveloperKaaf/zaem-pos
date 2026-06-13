import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ResourcesService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.resource.findMany({
      include: {
        prices: true,
        sessions: {
          where: { status: 'ACTIVE' },
          include: { invoice: true }
        }
      },
      orderBy: { name: 'asc' }
    });
  }

  async create(data: any) {
    return this.prisma.resource.create({
      data: {
        name: data.name,
        type: data.type,
        tuyaDeviceId: data.tuyaDeviceId,
        prices: {
          create: data.prices.map((p: any) => ({
            durationMin: parseInt(p.durationMin),
            price: parseFloat(p.price)
          }))
        }
      }
    });
  }

  async update(id: string, data: any) {
    const resource = await this.prisma.resource.findUnique({ where: { id } });
    if (!resource) throw new NotFoundException('الجهاز غير موجود');

    return this.prisma.$transaction(async (tx) => {
      await tx.resource.update({
        where: { id },
        data: {
          name: data.name,
          type: data.type,
          tuyaDeviceId: data.tuyaDeviceId
        }
      });

      if (data.prices) {
        await tx.priceConfig.deleteMany({ where: { resourceId: id } });
        await tx.priceConfig.createMany({
          data: data.prices.map((p: any) => ({
            resourceId: id,
            durationMin: parseInt(p.durationMin),
            price: parseFloat(p.price)
          }))
        });
      }
    });
  }

  async delete(id: string) {
    const resource = await this.prisma.resource.findUnique({
      where: { id },
      include: {
        sessions: {
          include: { invoice: true }
        }
      }
    });

    if (!resource) throw new NotFoundException('الجهاز غير موجود');

    const hasActiveSession = resource.sessions.some(s => s.status === 'ACTIVE');
    if (hasActiveSession) {
      throw new BadRequestException('لا يمكن حذف الجهاز لوجود جلسة نشطة حالياً. قم بإيقاف الجلسة أولاً.');
    }

    return this.prisma.$transaction(async (tx) => {
      // 1. حذف الفواتير المرتبطة بجلسات هذا الجهاز
      const sessionIds = resource.sessions.map(s => s.id);
      await tx.invoice.deleteMany({
        where: { sessionId: { in: sessionIds } }
      });

      // 2. حذف الجلسات
      await tx.session.deleteMany({
        where: { resourceId: id }
      });

      // 3. حذف إعدادات الأسعار
      await tx.priceConfig.deleteMany({
        where: { resourceId: id }
      });

      // 4. حذف الجهاز نفسه
      return tx.resource.delete({
        where: { id }
      });
    });
  }

  async getDashboardStats() {
    const activeSessions = await this.prisma.session.count({ where: { status: 'ACTIVE' } });

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    const dailyRevenue = await this.prisma.invoice.aggregate({
      where: {
        createdAt: { gte: today },
        isPaid: true
      },
      _sum: { totalAmount: true }
    });

    const monthlyRevenue = await this.prisma.invoice.aggregate({
      where: {
        createdAt: { gte: monthStart },
        isPaid: true
      },
      _sum: { totalAmount: true }
    });

    return {
      activeSessions,
      dailyRevenue: dailyRevenue._sum.totalAmount || 0,
      monthlyRevenue: monthlyRevenue._sum.totalAmount || 0,
    };
  }
}
