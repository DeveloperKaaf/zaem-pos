import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { LogsService } from '../logs/logs.service';

@Injectable()
export class InvoicesService {
  constructor(
    private prisma: PrismaService,
    private eventEmitter: EventEmitter2,
    private logsService: LogsService,
  ) {}

  async markAsPaid(invoiceId: number) {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: { session: { include: { resource: true } } }
    });

    if (!invoice) throw new NotFoundException('Invoice not found');

    const updatedInvoice = await this.prisma.invoice.update({
      where: { id: invoiceId },
      data: {
        isPaid: true,
        paymentDate: new Date(),
      },
    });

    await this.logsService.createLog(
      invoice.session.userId,
      'INVOICE_PAID',
      `تحصيل مبلغ ${invoice.totalAmount} ريال لـ ${invoice.session.resource.name}`
    );

    this.eventEmitter.emit('dashboard.updated', { type: 'INVOICE_PAID', invoiceId });
    return updatedInvoice;
  }

  async addItem(invoiceId: number, productId: string, quantity: number) {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: { session: true }
    });
    if (!invoice) throw new NotFoundException('Invoice not found');

    const product = await this.prisma.product.findUnique({ where: { id: productId } });
    if (!product) throw new NotFoundException('Product not found');

    // التأكد من توفر المخزون
    if (product.stock < quantity) {
      throw new BadRequestException(`الكمية المطلوبة غير متوفرة في المخزون. المتوفر: ${product.stock}`);
    }

    const itemTotal = product.price * quantity;

    let items = invoice.items as any[] || [];
    items.push({
      productId: product.id,
      name: product.name,
      price: product.price,
      quantity: quantity,
      total: itemTotal
    });

    const newItemsAmount = invoice.itemsAmount + itemTotal;
    const newTotalAmount = invoice.timeAmount + newItemsAmount;

    // تحديث الفاتورة وخصم المخزون في عملية واحدة (Transaction)
    const updatedInvoice = await this.prisma.$transaction(async (tx) => {
      // 1. خصم من المخزون
      await tx.product.update({
        where: { id: productId },
        data: { stock: { decrement: quantity } }
      });

      // 2. تحديث الفاتورة
      return tx.invoice.update({
        where: { id: invoiceId },
        data: {
          items: items,
          itemsAmount: newItemsAmount,
          totalAmount: newTotalAmount
        }
      });
    });

    this.eventEmitter.emit('session.updated', { sessionId: invoice.sessionId });
    return updatedInvoice;
  }

  async getPendingInvoices() {
    return this.prisma.invoice.findMany({
      where: {
        isPaid: false,
        session: {
          status: 'COMPLETED'
        }
      },
      include: {
        session: {
          include: {
            resource: true,
            user: { select: { name: true } }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
  }
}
