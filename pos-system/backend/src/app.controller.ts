import { Controller, Get, Res } from '@nestjs/common';

@Controller()
export class AppController {
  @Get()
  getHello() {
    return {
      status: 'success',
      message: 'Zaem POS System Backend is Running',
      version: '1.0.0',
      api_endpoints: '/api',
      auth_endpoints: '/auth/login'
    };
  }
}
