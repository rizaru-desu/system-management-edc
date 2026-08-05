import { Body, Controller, Get, Put } from '@nestjs/common';
import { Roles, Session, type UserSession } from '@thallesp/nestjs-better-auth';
import { sessionUser } from '../auth/session-user';
import { normalizeUserRoles } from './permission.constants';
import { parseSaveRolePermissionsDto } from './dto/save-role-permissions.dto';
import type { PermissionMatrix } from './dto/save-role-permissions.dto';
import type { EffectivePermissions } from './permissions.service';
import { PermissionsService } from './permissions.service';

@Controller('permissions')
export class PermissionsController {
  constructor(private readonly permissionsService: PermissionsService) {}

  /**
   * The caller's own effective grants (union over their roles). Available to
   * every authenticated user so the frontend can drive menus and buttons;
   * matrix administration below stays System Administrator-only.
   */
  @Get('me')
  me(@Session() session: UserSession): Promise<EffectivePermissions> {
    return this.permissionsService.getEffectivePermissions(
      normalizeUserRoles(sessionUser(session).role),
    );
  }

  @Get()
  @Roles(['System_Administrator'])
  async get(): Promise<{ matrix: PermissionMatrix }> {
    return { matrix: await this.permissionsService.getMatrix() };
  }

  @Put()
  @Roles(['System_Administrator'])
  async save(@Body() body: unknown): Promise<{ matrix: PermissionMatrix }> {
    const dto = parseSaveRolePermissionsDto(body);
    return { matrix: await this.permissionsService.saveMatrix(dto.matrix) };
  }
}
