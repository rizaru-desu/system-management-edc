import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { auth, isLdapEmail, roles } from '@repo/auth';
import { APIError } from 'better-auth/api';
import {
  countUserStats,
  findUserListItem,
  listUsers,
  updateUserAccount,
} from '@repo/db';
import type {
  ListUsersOptions,
  UserListItem,
  UserListPage,
  UserStats,
} from '@repo/db';
import type { CreateUserDto } from './dto/create-user.dto';
import { SYS_ADMIN_ROLE, type UpdateUserDto } from './dto/update-user.dto';

/** The caller identity the create/update rules need, derived in the controller. */
export interface UpdateCaller {
  id: string;
  isSysAdmin: boolean;
}

/** Narrows a stored role key to the Better Auth catalogue (runtime-checked). */
function isCatalogueRole(key: string): key is keyof typeof roles {
  return Object.hasOwn(roles, key);
}

/**
 * `code`/`message` of an APIError body, whose upstream type is too loose to
 * read from directly.
 */
function apiErrorDetails(error: APIError): {
  code?: string;
  message?: string;
} {
  const body: unknown = error.body;
  if (!body || typeof body !== 'object') return {};
  return {
    code:
      'code' in body && typeof body.code === 'string' ? body.code : undefined,
    message:
      'message' in body && typeof body.message === 'string'
        ? body.message
        : undefined,
  };
}

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  /**
   * Lists one page of console users plus the filtered total, optionally
   * live-filtered by a case-insensitive name/email search and/or an exact
   * role key (the query itself lives in @repo/db).
   */
  list(options: ListUsersOptions): Promise<UserListPage> {
    return listUsers(options);
  }

  /**
   * Creates a console account with an admin-set initial password. Goes
   * through `auth.api.createUser` — called server-side without request
   * headers it skips the admin plugin's own session check (authorization
   * already happened via the role-permission matrix), while still hashing
   * the password with the configured Argon2id hasher, validating the role
   * keys against the Better Auth catalogue and linking the `credential`
   * account row. Non-admin callers with a "create" grant may not mint
   * System Administrator accounts (privilege-escalation guard).
   */
  async create(
    dto: CreateUserDto,
    caller: UpdateCaller,
  ): Promise<UserListItem> {
    if (!caller.isSysAdmin && dto.roles.includes(SYS_ADMIN_ROLE)) {
      throw new ForbiddenException(
        'Only a System Administrator can manage System Administrator accounts.',
      );
    }

    // The DTO only pattern-validates keys; check them against the actual
    // catalogue here so unknown keys fail with a clear 400 instead of
    // Better Auth's opaque "non-existent value" error.
    const roleKeys = dto.roles.filter(isCatalogueRole);
    if (roleKeys.length !== dto.roles.length) {
      const unknown = dto.roles.filter((key) => !isCatalogueRole(key));
      throw new BadRequestException(
        `Unknown role key(s): ${unknown.join(', ')}.`,
      );
    }

    let created: { user: { id: string } };
    try {
      created = await auth.api.createUser({
        body: {
          email: dto.email,
          password: dto.password,
          name: dto.name,
          role: roleKeys,
          data: {
            banned: dto.banned,
            banReason: dto.banned ? dto.banReason : null,
          },
        },
      });
    } catch (error) {
      if (error instanceof APIError && error.status === 'BAD_REQUEST') {
        const { code, message } = apiErrorDetails(error);
        if (code === 'USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL') {
          throw new ConflictException(
            'Email is already in use by another account.',
          );
        }
        throw new BadRequestException(message ?? 'Failed to create user.');
      }
      throw error;
    }

    // Non-AD accounts must verify their email before they can sign in
    // (requireEmailVerification), so queue the activation link right away.
    // Fire-and-forget: a mail outage must not fail user creation, and the
    // user can trigger a re-send later just by attempting to sign in.
    if (!isLdapEmail(dto.email)) {
      void auth.api
        .sendVerificationEmail({ body: { email: dto.email } })
        .catch((error: unknown) => {
          this.logger.error(
            `Failed to queue verification email for ${dto.email}`,
            error,
          );
        });
    }

    const row = await findUserListItem(created.user.id);
    // Only reachable if the row vanished right after the insert.
    if (!row) throw new InternalServerErrorException('Failed to create user.');
    return row;
  }

  /** Whole-table counts, independent of any list search/role filter. */
  stats(): Promise<UserStats> {
    return countUserStats(SYS_ADMIN_ROLE);
  }

  /**
   * Applies the edit-user form: name/email, the (possibly multi-) role list
   * and the active toggle, which maps onto Better Auth's ban semantics —
   * deactivating sets `banned` and revokes every session. Non-admin callers
   * with an "update" grant may not touch System Administrator accounts or
   * assign the role (privilege-escalation guard), and nobody can deactivate
   * their own account.
   */
  async update(
    id: string,
    dto: UpdateUserDto,
    caller: UpdateCaller,
  ): Promise<UserListItem> {
    if (caller.id === id && dto.banned) {
      throw new BadRequestException('You cannot deactivate your own account.');
    }

    const result = await updateUserAccount(id, {
      name: dto.name,
      email: dto.email,
      roles: dto.roles,
      banned: dto.banned,
      banReason: dto.banned ? dto.banReason : null,
      restrictedRole: caller.isSysAdmin ? undefined : SYS_ADMIN_ROLE,
    });
    if (result.ok) return result.user;

    if (result.error === 'email-taken') {
      throw new ConflictException(
        'Email is already in use by another account.',
      );
    }
    if (result.error === 'admin-restricted') {
      throw new ForbiddenException(
        'Only a System Administrator can manage System Administrator accounts.',
      );
    }
    throw new NotFoundException('User not found.');
  }
}
