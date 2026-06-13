import { Injectable, NotFoundException } from '@nestjs/common';
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
    if (!resource) throw new NotFoundException('Resource not found');

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
      include: { sessions: true }
    });

    if (!resource) throw new NotFoundException('Resource not found');

    const hasActiveSession = resource.sessions.some(s => s.status === 'ACTIVE');
    if (hasActiveSession) throw new Error('Cannot delete resource with active session');

    return this.prisma.$transaction(async (tx) => {
      await tx.priceConfig.deleteMany({ where: { resourceId: id } });
      await tx.invoice.deleteMany({ where: { session: { resourceId: id } } });
      await tx.session.deleteMany({ where: { resourceId: id } });
      return tx.resource.delete({ where: { id } });
    });
  }

  async getDashboardStats() {
    const activeSessions = await this.prisma.session.count({ where: { status: 'ACTIVE' } });

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    // إيراد اليوم
    const dailyRevenue = await this.prisma.invoice.aggregate({
      where: {
        createdAt: { gte: today },
        isPaid: true
      },
      _sum: { totalAmount: true }
    });

    // إيراد الشهر
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
