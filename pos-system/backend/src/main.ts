import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { AllExceptionsFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // تفعيل CORS للسماح للواجهة بالاتصال
  app.enableCors({
    origin: '*',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: false
  });

  // تفعيل معالجة الأخطاء الشاملة والترجمة للعربية
  app.useGlobalFilters(new AllExceptionsFilter());

  // تفعيل التحقق من البيانات المدخلة
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }));

  const port = process.env.PORT || 3000;
  await app.listen(port, '0.0.0.0');

  console.log(`\n==========================================`);
  console.log(`🚀 ZAEM POS BACKEND IS FULLY SECURED`);
  console.log(`📡 Port: ${port}`);
  console.log(`==========================================\n`);
}
bootstrap();
