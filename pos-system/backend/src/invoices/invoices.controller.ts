import { Controller, Get, Post, Body, Param, UseGuards, ParseIntPipe } from '@nestjs/common';
import { InvoicesService } from './invoices.service';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('invoices')
@UseGuards(RolesGuard)
export class InvoicesController {
  constructor(private readonly invoicesService: InvoicesService) {}

  @Get('pending')
  getPending() {
    return this.invoicesService.getPendingInvoices();
  }

  @Post(':id/pay')
  @Roles('ADMIN', 'CASHIER')
  pay(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: {
      paymentMethod: string;
      splitData?: { cash: number, net: number };
      discountData?: { amount: number, type: 'FIXED' | 'PERCENT' }
    }
  ) {
    return this.invoicesService.markAsPaid(id, body.paymentMethod, body.splitData, body.discountData);
  }

  @Post(':id/add-item')
  addItem(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { productId: string; quantity: number }
  ) {
    return this.invoicesService.addItem(id, body.productId, body.quantity);
  }
}
