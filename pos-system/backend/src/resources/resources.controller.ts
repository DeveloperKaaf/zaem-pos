import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ResourcesService } from './resources.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('resources')
@UseGuards(JwtAuthGuard, RolesGuard) // تأكدنا من وضع الحارسين معاً بالترتيب الصحيح
export class ResourcesController {
  constructor(private readonly resourcesService: ResourcesService) {}

  @Get()
  findAll() {
    return this.resourcesService.findAll();
  }

  @Post()
  @Roles('ADMIN')
  create(@Body() data: any) {
    return this.resourcesService.create(data);
  }

  @Put(':id')
  @Roles('ADMIN')
  update(@Param('id') id: string, @Body() data: any) {
    return this.resourcesService.update(id, data);
  }

  @Delete(':id')
  @Roles('ADMIN')
  remove(@Param('id') id: string) {
    return this.resourcesService.delete(id);
  }

  @Get('stats')
  getStats() {
    return this.resourcesService.getDashboardStats();
  }
}
