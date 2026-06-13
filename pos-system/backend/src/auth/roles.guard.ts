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

    if (!requiredRoles) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    // التحقق من وجود المستخدم في الطلب (الذي وضعه JwtAuthGuard)
    const user = request.user;

    if (!user) {
      console.error('RolesGuard: No user found in request');
      throw new UnauthorizedException('يجب تسجيل الدخول أولاً للقيام بهذا الإجراء (لم يتم العثور على بيانات المستخدم)');
    }

    const userRole = (user.role || '').toUpperCase();
    const hasRole = requiredRoles.some((role) => userRole === role.toUpperCase());

    if (!hasRole) {
      console.warn(`RolesGuard: User ${user.username} with role ${userRole} tried to access forbidden route`);
    }

    return hasRole;
  }
}
