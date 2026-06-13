import { Controller, Get, Query, UseGuards, Request } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('reports')
@UseGuards(JwtAuthGuard)
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get()
  getReport(@Query('range') range: 'daily' | 'weekly' | 'monthly') {
    return this.reportsService.getFinancialReport(range || 'daily');
  }

  @Get('shift')
  async getShift(@Request() req) {
    // req.user contains { sub: userId, username, role } from JwtAuthGuard
    const report = await this.reportsService.getShiftReport(req.user.sub);
    return {
        ...report,
        cashierName: req.user.username // Use the name from the token
    };
  }
}
