import {
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { normalizeUserRoles } from './permission.constants';
import {
  REQUIRED_PERMISSION_KEY,
  type RequiredPermission,
} from './require-permission.decorator';
import { PermissionsService } from './permissions.service';

/** Request shape after the Better Auth `AuthGuard` has attached the user. */
interface AuthedRequest {
  user?: { role?: string | null } | null;
}

/**
 * Enforces `@RequirePermission(module, action)` against the stored
 * role-permission matrix. Registered globally (see `PermissionsModule`), but
 * inert on routes without the decorator. Runs after the library's global
 * `AuthGuard`, so `request.user` is already populated for protected routes.
 */
@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly permissionsService: PermissionsService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const required = this.reflector.getAllAndOverride<
      RequiredPermission | undefined
    >(REQUIRED_PERMISSION_KEY, [context.getHandler(), context.getClass()]);
    if (!required) return true;

    const request = context.switchToHttp().getRequest<AuthedRequest>();
    // Defense in depth: on a decorated route the AuthGuard should already
    // have rejected anonymous callers (unless someone marks it @Public).
    if (!request.user) throw new UnauthorizedException();

    const roles = normalizeUserRoles(request.user.role);
    const allowed = await this.permissionsService.hasPermission(
      roles,
      required.module,
      required.action,
    );
    if (!allowed) {
      throw new ForbiddenException(
        `You do not have "${required.action}" permission on the "${required.module}" module.`,
      );
    }
    return true;
  }
}
