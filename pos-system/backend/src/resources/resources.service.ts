import { Injectable, NotFoundException, BadRequestException, InternalServerErrorException } from '@nestjs/common';
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
        data: { name: data.name, type: data.type, tuyaDeviceId: data.tuyaDeviceId }
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

    if (!resource) throw new NotFoundException('هذا الجهاز غير موجود');

    const hasActiveSession = resource.sessions.some(s => s.status === 'ACTIVE');
    if (hasActiveSession) {
      throw new BadRequestException('لا يمكن حذف الجهاز لوجود جلسة نشطة حالياً. يرجى إيقافها أولاً.');
    }

    try {
      return await this.prisma.$transaction(async (tx) => {
        const sessionIds = resource.sessions.map(s => s.id);
        if (sessionIds.length > 0) {
          await tx.invoice.deleteMany({ where: { sessionId: { in: sessionIds } } });
        }
        await tx.session.deleteMany({ where: { resourceId: id } });
        await tx.priceConfig.deleteMany({ where: { resourceId: id } });
        return await tx.resource.delete({ where: { id } });
      });
    } catch (error) {
      console.error('Delete Resource Error:', error);
      throw new InternalServerErrorException('حدث خطأ أثناء محاولة مسح السجلات المرتبطة من قاعدة البيانات.');
    }
  }

  async deleteAll() {
    const activeSessions = await this.prisma.session.count({
      where: { status: 'ACTIVE' }
    });

    if (activeSessions > 0) {
      throw new BadRequestException('لا يمكن حذف جميع الأجهزة لوجود جلسات نشطة حالياً. يرجى إغلاق كافة الجلسات أولاً.');
    }

    try {
      return await this.prisma.$transaction(async (tx) => {
        // حذف كافة الفواتير، الجلسات، تكوينات الأسعار، ثم الأجهزة
        await tx.invoice.deleteMany({});
        await tx.session.deleteMany({});
        await tx.priceConfig.deleteMany({});
        return await tx.resource.deleteMany({});
      });
    } catch (error) {
      console.error('Delete All Resources Error:', error);
      throw new InternalServerErrorException('حدث خطأ أثناء محاولة مسح كافة الأجهزة من قاعدة البيانات.');
    }
  }

  async getDashboardStats() {
    const activeSessions = await this.prisma.session.count({ where: { status: 'ACTIVE' } });
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dailyRevenue = await this.prisma.invoice.aggregate({
      where: { createdAt: { gte: today }, isPaid: true },
      _sum: { totalAmount: true }
    });
    return {
      activeSessions,
      dailyRevenue: dailyRevenue._sum.totalAmount || 0,
    };
  }
}
