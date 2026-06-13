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
  @Roles('ADMIN')
  pay(
    @Param('id', ParseIntPipe) id: number,
    @Body('paymentMethod') paymentMethod: string
  ) {
    return this.invoicesService.markAsPaid(id, paymentMethod);
  }

  @Post(':id/add-item')
  addItem(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { productId: string; quantity: number }
  ) {
    return this.invoicesService.addItem(id, body.productId, body.quantity);
  }
}
