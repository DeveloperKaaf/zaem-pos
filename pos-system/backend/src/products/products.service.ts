import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ProductsService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.product.findMany({ orderBy: { name: 'asc' } });
  }

  async create(data: any) {
    return this.prisma.product.create({
      data: {
        ...data,
        stock: parseInt(data.stock) || 0,
        price: parseFloat(data.price)
      }
    });
  }

  async updateStock(id: string, newStock: number) {
    return this.prisma.product.update({
      where: { id },
      data: { stock: newStock }
    });
  }

  async remove(id: string) {
    return this.prisma.product.delete({ where: { id } });
  }
}
