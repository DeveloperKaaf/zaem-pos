import { Controller, Post, Body, Param, UseGuards, Request } from '@nestjs/common';
import { SessionsService } from './sessions.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('sessions')
@UseGuards(JwtAuthGuard)
export class SessionsController {
  constructor(private readonly sessionsService: SessionsService) {}

  @Post('start')
  start(@Body() body: { resourceId: string; durationMin: number }, @Request() req) {
    return this.sessionsService.startSession(body.resourceId, body.durationMin, req.user.userId);
  }

  @Post('stop/:id')
  stop(@Param('id') id: string) {
    return this.sessionsService.stopSession(id);
  }
}
