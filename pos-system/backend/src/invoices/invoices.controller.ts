import { Controller, Get, Post, Body, Param, UseGuards, ParseIntPipe } from '@nestjs/common';
import { InvoicesService } from './invoices.service';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('invoices')
@UseGuards(RolesGuard) // استخدام الحارس الموحد الجديد
export class InvoicesController {
  constructor(private readonly invoicesService: InvoicesService) {}

  @Get('pending')
  getPending() {
    return this.invoicesService.getPendingInvoices();
  }

  @Post(':id/pay')
  @Roles('ADMIN') // التأكد أن المدير فقط من يحصل المبالغ
  pay(@Param('id', ParseIntPipe) id: number) {
    return this.invoicesService.markAsPaid(id);
  }

  @Post(':id/add-item')
  addItem(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { productId: string; quantity: number }
  ) {
    return this.invoicesService.addItem(id, body.productId, body.quantity);
  }
}
