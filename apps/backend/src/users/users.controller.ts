import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Search,
} from '@nestjs/common';
import { Session, type UserSession } from '@thallesp/nestjs-better-auth';
import type { UserListItem, UserListPage, UserStats } from '@repo/db';
import { sessionUser } from '../auth/session-user';
import {
  SYSTEM_ADMIN_ROLE,
  normalizeUserRoles,
} from '../permissions/permission.constants';
import { RequirePermission } from '../permissions/require-permission.decorator';
import { parseCreateUserDto } from './dto/create-user.dto';
import { parseListUsersDto } from './dto/list-users.dto';
import { parseUpdateUserDto } from './dto/update-user.dto';
import { UsersService } from './users.service';

/**
 * Access follows the role-permission matrix ("users" module) instead of a
 * hard-coded role list: System Administrators always pass, other roles need
 * a stored "view" grant on Users & Roles.
 */
@Controller('users')
@RequirePermission('users', 'view')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  /**
   * Served over HTTP QUERY (RFC 10008): safe and idempotent like GET, but
   * filters travel as a JSON body so they can grow arbitrarily complex
   * without URL-length limits or leaking into access logs. Nest's router has
   * no QUERY mapping yet, so main.ts rewrites QUERY to SEARCH and this
   * handler picks it up via @Search().
   */
  @Search()
  list(@Body() body: unknown): Promise<UserListPage> {
    return this.usersService.list(parseListUsersDto(body));
  }

  /** The add-user form: profile, role list and an admin-set initial password. */
  @Post()
  @RequirePermission('users', 'create')
  create(
    @Body() body: unknown,
    @Session() session: UserSession,
  ): Promise<UserListItem> {
    const dto = parseCreateUserDto(body);
    const caller = sessionUser(session);
    return this.usersService.create(dto, {
      id: caller.id,
      isSysAdmin: normalizeUserRoles(caller.role).includes(SYSTEM_ADMIN_ROLE),
    });
  }

  @Get('stats')
  stats(): Promise<UserStats> {
    return this.usersService.stats();
  }

  /** The edit-user form: profile, role list, active toggle (= ban/unban). */
  @Patch(':id')
  @RequirePermission('users', 'update')
  update(
    @Param('id') id: string,
    @Body() body: unknown,
    @Session() session: UserSession,
  ): Promise<UserListItem> {
    const dto = parseUpdateUserDto(body);
    const caller = sessionUser(session);
    return this.usersService.update(id, dto, {
      id: caller.id,
      isSysAdmin: normalizeUserRoles(caller.role).includes(SYSTEM_ADMIN_ROLE),
    });
  }
}
