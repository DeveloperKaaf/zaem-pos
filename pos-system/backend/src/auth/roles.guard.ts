import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from './roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // إذا لم تكن هناك أدوار مطلوبة، اسمح بالمرور
    if (!requiredRoles) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // تأمين الكود: إذا لم يكن المستخدم موجوداً في الطلب
    if (!user) {
      throw new UnauthorizedException('يجب تسجيل الدخول أولاً للقيام بهذا الإجراء');
    }

    // التأكد من وجود رتبة للمستخدم
    if (!user.role) {
      return false;
    }

    return requiredRoles.some((role) => user.role.toUpperCase() === role.toUpperCase());
  }
}
