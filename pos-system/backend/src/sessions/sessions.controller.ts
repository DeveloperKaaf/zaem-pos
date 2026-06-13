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
  start(@Body() body: { resourceId: string; durationMin: number; paymentMethod?: string }, @Request() req) {
    return this.sessionsService.startSession(body.resourceId, body.durationMin, req.user.sub, body.paymentMethod);
  }

  @Post('extend')
  @Roles('ADMIN')
  extend(@Body() body: { sessionId: string; extraMin: number; paymentMethod?: string }, @Request() req) {
    return this.sessionsService.extendSession(body.sessionId, body.extraMin, req.user.sub, body.paymentMethod);
  }

  @Post('stop/:id')
  @Roles('ADMIN', 'CASHIER')
  stop(@Param('id') id: string, @Request() req) {
    return this.sessionsService.stopSession(id, req.user.sub);
  }
}
