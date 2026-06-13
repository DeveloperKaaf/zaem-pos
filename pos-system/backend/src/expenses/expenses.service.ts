import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ExpensesService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.expense.findMany({ orderBy: { date: 'desc' } });
  }

  async create(data: any) {
    return this.prisma.expense.create({
      data: {
        description: data.description,
        amount: parseFloat(data.amount),
        category: data.category,
        date: new Date(),
        userId: data.userId
      }
    });
  }

  async remove(id: string) {
    return this.prisma.expense.delete({ where: { id } });
  }
}
