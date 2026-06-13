import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear } from 'date-fns';

@Injectable()
export class ReportsService {
  constructor(private prisma: PrismaService) {}

  async getFinancialReport(range: 'daily' | 'weekly' | 'monthly' | 'yearly') {
    let start: Date;
    let end: Date;
    const now = new Date();

    if (range === 'daily') {
      start = startOfDay(now);
      end = endOfDay(now);
    } else if (range === 'weekly') {
      start = startOfWeek(now);
      end = endOfWeek(now);
    } else if (range === 'monthly') {
      start = startOfMonth(now);
      end = endOfMonth(now);
    } else if (range === 'yearly') {
      start = startOfYear(now);
      end = endOfYear(now);
    } else {
      start = startOfMonth(now);
      end = endOfMonth(now);
    }

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

    const expenses = await this.prisma.expense.findMany({
      where: {
        date: { gte: start, lte: end }
      }
    });

    const totalRevenue = sessions.reduce((acc, s) => acc + (s.invoice?.totalAmount || 0), 0);
    const cashRevenue = sessions.reduce((acc, s) => {
      return s.invoice?.paymentMethod === 'CASH' || !s.invoice?.paymentMethod
        ? acc + (s.invoice?.totalAmount || 0)
        : acc;
    }, 0);
    const netRevenue = sessions.reduce((acc, s) => {
      return s.invoice?.paymentMethod === 'NET'
        ? acc + (s.invoice?.totalAmount || 0)
        : acc;
    }, 0);

    const totalExpenses = expenses.reduce((acc, e) => acc + e.amount, 0);
    const netProfit = totalRevenue - totalExpenses;

    const gamesRevenue = sessions.reduce((acc, s) => acc + (s.invoice?.timeAmount || 0), 0);
    const buffetRevenue = sessions.reduce((acc, s) => acc + (s.invoice?.itemsAmount || 0), 0);
    const sessionCount = sessions.length;

    const chartData = [
      { name: 'دخل الألعاب', amount: gamesRevenue },
      { name: 'دخل الكوفي شوب', amount: buffetRevenue },
      { name: 'إجمالي المصاريف', amount: totalExpenses }
    ];

    const pieData = [
      { name: 'الألعاب', value: gamesRevenue },
      { name: 'الكوفي شوب', value: buffetRevenue },
      { name: 'المصاريف', value: totalExpenses }
    ];

    const paymentData = [
      { name: 'كاش', value: cashRevenue },
      { name: 'شبكة', value: netRevenue }
    ];

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
      cashRevenue,
      netRevenue,
      totalExpenses,
      netProfit,
      gamesRevenue,
      buffetRevenue,
      sessionCount,
      chartData,
      pieData,
      paymentData,
      topResource: topResourceName,
      averageSessionTime: sessionCount > 0 ? (sessions.reduce((acc, s) => {
          if(s.endTime && s.startTime) return acc + (s.endTime.getTime() - s.startTime.getTime());
          return acc;
      }, 0) / sessionCount / (1000 * 60)).toFixed(0) : 0,
      sessions: sessions.map(s => ({
        id: s.id,
        resource: s.resource.name,
        amount: s.invoice?.totalAmount || 0,
        date: s.createdAt,
        type: s.resource.type,
        paymentMethod: s.invoice?.paymentMethod || 'CASH'
      }))
    };
  }

  async getShiftReport(userId: string) {
    const today = startOfDay(new Date());

    const invoices = await this.prisma.invoice.findMany({
      where: {
        isPaid: true,
        paymentDate: { gte: today },
        session: { userId: userId }
      },
      include: {
        session: {
          include: {
            resource: true,
            user: true
          }
        }
      }
    });

    const expenses = await this.prisma.expense.findMany({
      where: {
        date: { gte: today },
        userId: userId
      }
    });

    const timeTotal = invoices.reduce((acc, inv) => acc + inv.timeAmount, 0);
    const itemsTotal = invoices.reduce((acc, inv) => acc + inv.itemsAmount, 0);
    const totalRevenue = timeTotal + itemsTotal;

    const cashTotal = invoices.reduce((acc, inv) => {
      return inv.paymentMethod === 'CASH' || !inv.paymentMethod ? acc + inv.totalAmount : acc;
    }, 0);
    const netTotal = invoices.reduce((acc, inv) => {
      return inv.paymentMethod === 'NET' ? acc + inv.totalAmount : acc;
    }, 0);

    const totalExpenses = expenses.reduce((acc, e) => acc + e.amount, 0);
    const grandTotal = totalRevenue - totalExpenses;

    const user = await this.prisma.user.findUnique({ where: { id: userId } });

    return {
      cashierName: user?.name || userId,
      ordersCount: invoices.length,
      timeTotal,
      itemsTotal,
      totalRevenue,
      cashTotal,
      netTotal,
      totalExpenses,
      grandTotal,
      invoices: invoices.map(inv => ({
        id: inv.id,
        resource: inv.session.resource.name,
        amount: inv.totalAmount,
        timeAmount: inv.timeAmount,
        itemsAmount: inv.itemsAmount,
        paymentMethod: inv.paymentMethod || 'CASH',
        items: inv.items,
        date: inv.paymentDate,
        startTime: inv.session.startTime,
        endTime: inv.session.endTime,
        durationMin: inv.session.durationMin
      })),
      expenses
    };
  }
}
