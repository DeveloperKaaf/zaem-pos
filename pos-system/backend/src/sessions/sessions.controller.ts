import { Controller, Post, Body, Param, UseGuards, Request } from '@nestjs/common';
import { SessionsService } from './sessions.service';
import { RolesGuard } from '../auth/roles.guard';

@Controller('sessions')
@UseGuards(RolesGuard)
export class SessionsController {
  constructor(private readonly sessionsService: SessionsService) {}

  @Post('start')
  start(@Body() body: { resourceId: string; durationMin: number }, @Request() req) {
    return this.sessionsService.startSession(body.resourceId, body.durationMin, req.user.sub);
  }

  @Post('stop/:id')
  stop(@Param('id') id: string, @Request() req) {
    return this.sessionsService.stopSession(id, req.user.sub);
  }
}
