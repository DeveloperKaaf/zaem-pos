import { Injectable, CanActivate, ExecutionContext, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { ROLES_KEY } from './roles.decorator';

@Injectable()
export class AuthAndRolesGuard implements CanActivate {
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

    // 1. التأكد من وجود الـ Token
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('يجب تسجيل الدخول أولاً');
    }

    const token = authHeader.split(' ')[1];

    try {
      // 2. فك تشفير الـ Token والتعرف على المستخدم
      const payload = await this.jwtService.verifyAsync(token, {
        secret: process.env.JWT_SECRET || 'SUPER_SECRET_KEY',
      });

      request['user'] = payload;

      // 3. إذا لم تكن العملية تتطلب رتبة معينة (مثل العرض فقط)، اسمح بالمرور
      if (!requiredRoles) return true;

      // 4. التحقق من الرتبة (ADMIN)
      const userRole = (payload.role || '').toUpperCase();
      const hasRole = requiredRoles.some((role) => userRole === role.toUpperCase());

      if (!hasRole) {
        throw new ForbiddenException('عذراً، هذه العملية للمدير فقط');
      }

      return true;
    } catch (e) {
      console.error('Security Guard Error:', e.message);
      throw new UnauthorizedException('انتهت صلاحية الجلسة أو السيكرت غير متطابق. يرجى تسجيل الخروج والدخول مجدداً.');
    }
  }
}
