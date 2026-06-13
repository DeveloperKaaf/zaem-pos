import { Controller, Get, Post, Body, Query, UseGuards, Request } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('reports')
@UseGuards(RolesGuard)
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get()
  @Roles('ADMIN')
  getFinancial(@Query('range') range: 'daily' | 'weekly' | 'monthly' | 'yearly') {
    return this.reportsService.getFinancialReport(range);
  }

  @Get('shift')
  @Roles('ADMIN', 'CASHIER')
  getShift(@Request() req) {
    return this.reportsService.getShiftReport(req.user.sub);
  }

  @Post('shift/start')
  @Roles('ADMIN', 'CASHIER')
  startShift(@Body() body: { floatAmount: number }, @Request() req) {
    return this.reportsService.startShift(req.user.sub, body.floatAmount);
  }

  @Get('shift/status')
  @Roles('ADMIN', 'CASHIER')
  getShiftStatus(@Request() req) {
    return this.reportsService.getShiftStatus(req.user.sub);
  }
}
