import { Injectable, CanActivate, ExecutionContext, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { ROLES_KEY } from './roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private jwtService: JwtService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;

    // 1. استخراج الـ Token من الهيدر
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('لم يتم العثور على تصريح الدخول. يرجى تسجيل الدخول مجدداً.');
    }

    const token = authHeader.split(' ')[1];

    try {
      // 2. فك التشفير باستخدام السكرت الموحد
      const payload = await this.jwtService.verifyAsync(token, {
        secret: process.env.JWT_SECRET || 'SUPER_SECRET_KEY',
      });

      request['user'] = payload;

      // 3. إذا كانت العملية لا تتطلب صلاحيات خاصة، اسمح بالمرور
      if (!requiredRoles) return true;

      // 4. التحقق من الرتبة (ADMIN)
      const userRole = (payload.role || '').toUpperCase();
      const hasRole = requiredRoles.some((role) => userRole === role.toUpperCase());

      if (!hasRole) {
        throw new ForbiddenException('عذراً، هذه الصلاحية للمدير فقط');
      }

      return true;
    } catch (e) {
      console.error('Guard Error:', e.message);
      throw new UnauthorizedException('انتهت صلاحية الجلسة أو حدث خطأ في التشفير. يرجى تسجيل الخروج والدخول مجدداً.');
    }
  }
}
