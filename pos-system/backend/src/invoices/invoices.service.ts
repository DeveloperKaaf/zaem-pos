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

  async markAsPaid(
    invoiceId: number,
    paymentMethod: string = 'CASH',
    splitData?: { cash: number, net: number },
    discountData?: { amount: number, type: 'FIXED' | 'PERCENT' }
  ) {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: { session: { include: { resource: true, user: { select: { name: true } } } } }
    });

    if (!invoice) throw new NotFoundException('Invoice not found');

    const subtotal = invoice.timeAmount + invoice.itemsAmount;
    let discountValue = 0;

    if (discountData && discountData.amount > 0) {
      if (discountData.type === 'PERCENT') {
        discountValue = subtotal * (discountData.amount / 100);
      } else {
        discountValue = discountData.amount;
      }
    }

    const finalTotal = Math.max(0, subtotal - discountValue);

    const updateData: any = {
      isPaid: true,
      paymentDate: new Date(),
      paymentMethod: paymentMethod,
      discount: discountData?.amount || 0,
      discountType: discountData?.type || 'FIXED',
      totalAmount: finalTotal,
    };

    if (paymentMethod === 'SPLIT' && splitData) {
      updateData.cashAmount = splitData.cash;
      updateData.netAmount = splitData.net;
    } else if (paymentMethod === 'CASH') {
      updateData.cashAmount = finalTotal;
      updateData.netAmount = 0;
    } else if (paymentMethod === 'NET') {
      updateData.cashAmount = 0;
      updateData.netAmount = finalTotal;
    }

    const updatedInvoice = await this.prisma.invoice.update({
      where: { id: invoiceId },
      data: updateData,
      include: {
        session: {
          include: {
            resource: true,
            user: { select: { name: true } }
          }
        }
      }
    });

    let logMessage = `تحصيل مبلغ ${finalTotal} ريال (بعد خصم ${discountValue}) لـ ${invoice.session.resource.name}`;
    await this.logsService.createLog(invoice.session.userId, 'INVOICE_PAID', logMessage);

    this.eventEmitter.emit('dashboard.updated', { type: 'INVOICE_PAID', invoiceId });
    return updatedInvoice;
  }

  // ... دالة addItem و getPendingInvoices تبقى كما هي مع التأكد من تحديث totalAmount
  async addItem(invoiceId: number, productId: string, quantity: number) {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: { session: true }
    });
    if (!invoice) throw new NotFoundException('Invoice not found');

    const product = await this.prisma.product.findUnique({ where: { id: productId } });
    if (!product) throw new NotFoundException('Product not found');

    if (product.stock < quantity) {
      throw new BadRequestException(`الكمية المطلوبة غير متوفرة. المتوفر: ${product.stock}`);
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
    const subtotal = invoice.timeAmount + newItemsAmount;

    // إعادة حساب المجموع مع مراعاة الخصم المسجل مسبقاً إن وجد
    let discountValue = 0;
    if (invoice.discount > 0) {
      discountValue = invoice.discountType === 'PERCENT' ? subtotal * (invoice.discount / 100) : invoice.discount;
    }
    const newTotalAmount = Math.max(0, subtotal - discountValue);

    const updatedInvoice = await this.prisma.$transaction(async (tx) => {
      await tx.product.update({
        where: { id: productId },
        data: { stock: { decrement: quantity } }
      });

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
      where: { isPaid: false, session: { status: 'COMPLETED' } },
      include: { session: { include: { resource: true, user: { select: { name: true } } } } },
      orderBy: { createdAt: 'desc' }
    });
  }
}
