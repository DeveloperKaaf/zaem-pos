import { Controller, Post, Body, Param, UseGuards, Request } from '@nestjs/common';
import { SessionsService } from './sessions.service';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('sessions')
@UseGuards(RolesGuard)
export class SessionsController {
  constructor(private readonly sessionsService: SessionsService) {}

  @Post('start')
  @Roles('ADMIN', 'CASHIER')
  start(@Body() body: { resourceId: string; durationMin: number; paymentMethod?: string; splitData?: { cash: number, net: number } }, @Request() req) {
    return this.sessionsService.startSession(body.resourceId, body.durationMin, req.user.sub, body.paymentMethod, body.splitData);
  }

  @Post('extend')
  @Roles('ADMIN')
  extend(@Body() body: { sessionId: string; extraMin: number; paymentMethod?: string; splitData?: { cash: number, net: number } }, @Request() req) {
    return this.sessionsService.extendSession(body.sessionId, body.extraMin, req.user.sub, body.paymentMethod, body.splitData);
  }

  @Post('stop/:id')
  @Roles('ADMIN', 'CASHIER')
  stop(@Param('id') id: string, @Body() body: { paymentMethod?: string; splitData?: { cash: number, net: number } }, @Request() req) {
    return this.sessionsService.stopSession(id, req.user.sub, body.paymentMethod, body.splitData);
  }
}
