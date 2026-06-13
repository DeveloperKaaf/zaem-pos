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
      include: { sessions: { where: { status: 'ACTIVE' } } }
    });

    if (!resource) throw new NotFoundException('الجهاز غير موجود');
    if (resource.sessions.length > 0) {
      throw new BadRequestException('لا يمكن حذف الجهاز لوجود جلسة نشطة حالياً.');
    }

    try {
      // بفضل خاصية Cascade في الـ Schema، سيتم حذف كل شيء مرتبط تلقائياً
      return await this.prisma.resource.delete({ where: { id } });
    } catch (error) {
      console.error(error);
      throw new InternalServerErrorException('حدث خطأ أثناء الحذف من قاعدة البيانات');
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
