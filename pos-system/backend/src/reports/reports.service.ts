import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';

@Injectable()
export class ReportsService {
  constructor(private prisma: PrismaService) {}

  async getFinancialReport(range: 'daily' | 'weekly' | 'monthly') {
    let start: Date;
    let end: Date;
    const now = new Date();

    if (range === 'daily') {
      start = startOfDay(now);
      end = endOfDay(now);
    } else if (range === 'weekly') {
      start = startOfWeek(now);
      end = endOfWeek(now);
    } else {
      start = startOfMonth(now);
      end = endOfMonth(now);
    }

    // 1. جلب الفواتير المحصلة
    const sessions = await this.prisma.session.findMany({
      where: {
        createdAt: { gte: start, lte: end },
        status: 'COMPLETED',
      },
      include: {
        resource: true,
        invoice: true,
      },
    });

    // 2. جلب المصروفات لنفس الفترة
    const expenses = await this.prisma.expense.findMany({
      where: {
        date: { gte: start, lte: end }
      }
    });

    const totalRevenue = sessions.reduce((acc, s) => acc + (s.invoice?.totalAmount || 0), 0);
    const totalExpenses = expenses.reduce((acc, e) => acc + e.amount, 0);
    const netProfit = totalRevenue - totalExpenses;

    const gamesRevenue = sessions.reduce((acc, s) => acc + (s.invoice?.timeAmount || 0), 0);
    const buffetRevenue = sessions.reduce((acc, s) => acc + (s.invoice?.itemsAmount || 0), 0);
    const sessionCount = sessions.length;

    // تجهيز بيانات الرسم البياني للمقارنة
    const chartData = [
      { name: 'دخل الألعاب', amount: gamesRevenue },
      { name: 'دخل البوفيه', amount: buffetRevenue },
      { name: 'إجمالي المصاريف', amount: totalExpenses }
    ];

    const pieData = [
      { name: 'الألعاب', value: gamesRevenue },
      { name: 'البوفيه', value: buffetRevenue },
      { name: 'المصاريف', value: totalExpenses }
    ];

    // المورد الأكثر استخداماً
    const resourceUsage = await this.prisma.session.groupBy({
      by: ['resourceId'],
      _count: { id: true },
      where: { createdAt: { gte: start, lte: end } },
      orderBy: { _count: { id: 'desc' } },
      take: 1,
    });

    let topResourceName = 'N/A';
    if (resourceUsage.length > 0) {
      const res = await this.prisma.resource.findUnique({ where: { id: resourceUsage[0].resourceId } });
      topResourceName = res?.name || 'N/A';
    }

    return {
      totalRevenue,
      totalExpenses,
      netProfit,
      gamesRevenue,
      buffetRevenue,
      sessionCount,
      chartData,
      pieData,
      topResource: topResourceName,
      averageSessionTime: sessionCount > 0 ? (sessions.reduce((acc, s) => {
          if(s.endTime && s.startTime) return acc + (s.endTime.getTime() - s.startTime.getTime());
          return acc;
      }, 0) / sessionCount / (1000 * 60)).toFixed(0) : 0,
    };
  }

  // ميزة تقفيل الشفت
  async getShiftReport(userId: string) {
    const today = startOfDay(new Date());

    const invoices = await this.prisma.invoice.findMany({
      where: {
        isPaid: true,
        paymentDate: { gte: today },
        session: { userId: userId }
      },
      include: { session: { include: { resource: true } } }
    });

    const total = invoices.reduce((acc, inv) => acc + inv.totalAmount, 0);
    const timeTotal = invoices.reduce((acc, inv) => acc + inv.timeAmount, 0);
    const itemsTotal = invoices.reduce((acc, inv) => acc + inv.itemsAmount, 0);

    return {
      cashierName: userId,
      ordersCount: invoices.length,
      timeTotal,
      itemsTotal,
      grandTotal: total,
      invoices: invoices.map(inv => ({
        id: inv.id,
        resource: inv.session.resource.name,
        amount: inv.totalAmount,
        date: inv.paymentDate
      }))
    };
  }
}
