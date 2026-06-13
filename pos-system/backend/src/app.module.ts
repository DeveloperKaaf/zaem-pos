import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { PrismaService } from './prisma/prisma.service';
import { TuyaService } from './tuya/tuya.service';
import { SessionsService } from './sessions/sessions.service';
import { ResourcesService } from './resources/resources.service';
import { AuthService } from './auth/auth.service';
import { AuthController } from './auth/auth.controller';
import { AppController } from './app.controller';
import { EventsGateway } from './events/events.gateway';
import { ResourcesController } from './resources/resources.controller';
import { SessionsController } from './sessions/sessions.controller';
import { InvoicesService } from './invoices/invoices.service';
import { InvoicesController } from './invoices/invoices.controller';
import { ReportsService } from './reports/reports.service';
import { ReportsController } from './reports/reports.controller';
import { LogsService } from './logs/logs.service';
import { LogsController } from './logs/logs.controller';
import { UsersService } from './users/users.service';
import { UsersController } from './users/users.controller';
import { CleanupService } from './sessions/cleanup.service';
import { ProductsService } from './products/products.service';
import { ProductsController } from './products/products.controller';
import { ExpensesService } from './expenses/expenses.service';
import { ExpensesController } from './expenses/expenses.controller';
import { JwtModule } from '@nestjs/jwt';
import { APP_GUARD } from '@nestjs/core';
import { RolesGuard } from './auth/roles.guard';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    EventEmitterModule.forRoot(),
    JwtModule.register({
      global: true,
      secret: process.env.JWT_SECRET || 'SUPER_SECRET_KEY',
      signOptions: { expiresIn: '1d' },
    }),
  ],
  controllers: [
    AppController,
    AuthController,
    ResourcesController,
    SessionsController,
    InvoicesController,
    ReportsController,
    LogsController,
    UsersController,
    ProductsController,
    ExpensesController
  ],
  providers: [
    PrismaService,
    TuyaService,
    SessionsService,
    ResourcesService,
    AuthService,
    EventsGateway,
    InvoicesService,
    ReportsService,
    LogsService,
    UsersService,
    CleanupService,
    ProductsService,
    ExpensesService,
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
  ],
})
export class AppModule {}
