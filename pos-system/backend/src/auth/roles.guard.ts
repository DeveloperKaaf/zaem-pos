import { Injectable, CanActivate, ExecutionContext, UnauthorizedException, ForbiddenException } from '@nestjs/common';
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

    // إذا لم تكن هناك أدوار مطلوبة (مثل العمليات المتاحة للجميع)، اسمح بالمرور
    if (!requiredRoles) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user; // البيانات التي وضعها الـ JwtAuthGuard

    if (!user) {
      console.error('RolesGuard Error: No user object found in request. Check if JwtAuthGuard is applied before RolesGuard.');
      throw new UnauthorizedException('يجب تسجيل الدخول أولاً للقيام بهذا الإجراء');
    }

    const userRole = (user.role || '').toUpperCase();
    const hasRole = requiredRoles.some((role) => userRole === role.toUpperCase());

    if (!hasRole) {
      console.warn(`Access Denied: User ${user.username} with role ${userRole} attempted to access route requiring ${requiredRoles}`);
      throw new ForbiddenException('عذراً، لا تملك الصلاحيات الكافية للقيام بهذا الإجراء');
    }

    return true;
  }
}
