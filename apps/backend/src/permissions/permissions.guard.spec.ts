import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import type { ExecutionContext } from '@nestjs/common';
import type { Reflector } from '@nestjs/core';
import { PermissionsGuard } from './permissions.guard';
import type { PermissionsService } from './permissions.service';
import type { RequiredPermission } from './require-permission.decorator';

// The guard's constructor references PermissionsService, whose module pulls
// in @repo/db (which validates DATABASE_URL at import time). Stub it out —
// these tests only exercise the guard against a mocked service.
jest.mock('@repo/db', () => ({
  listRolePermissions: jest.fn(),
  replaceRolePermissions: jest.fn(),
}));

function contextFor(user: { role?: string | null } | null): ExecutionContext {
  return {
    getHandler: () => function handler() {},
    getClass: () => class TestController {},
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
  } as unknown as ExecutionContext;
}

describe('PermissionsGuard', () => {
  let required: RequiredPermission | undefined;
  let hasPermission: jest.Mock;
  let guard: PermissionsGuard;

  beforeEach(() => {
    required = { module: 'users', action: 'view' };
    hasPermission = jest.fn();
    const reflector = {
      getAllAndOverride: jest.fn(() => required),
    } as unknown as Reflector;
    const service = { hasPermission } as unknown as PermissionsService;
    guard = new PermissionsGuard(reflector, service);
  });

  it('allows undecorated routes without touching the service', async () => {
    required = undefined;
    await expect(guard.canActivate(contextFor(null))).resolves.toBe(true);
    expect(hasPermission).not.toHaveBeenCalled();
  });

  it('rejects requests without an authenticated user', async () => {
    await expect(guard.canActivate(contextFor(null))).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('allows when the service grants the required action', async () => {
    hasPermission.mockResolvedValue(true);
    await expect(
      guard.canActivate(contextFor({ role: 'Operations_Specialist' })),
    ).resolves.toBe(true);
    expect(hasPermission).toHaveBeenCalledWith(
      ['Operations_Specialist'],
      'users',
      'view',
    );
  });

  it('normalizes comma-separated Better Auth roles before checking', async () => {
    hasPermission.mockResolvedValue(true);
    await guard.canActivate(
      contextFor({ role: 'System_Administrator, Operations_Specialist' }),
    );
    expect(hasPermission).toHaveBeenCalledWith(
      ['System_Administrator', 'Operations_Specialist'],
      'users',
      'view',
    );
  });

  it('rejects with 403 when the grant is missing', async () => {
    hasPermission.mockResolvedValue(false);
    await expect(
      guard.canActivate(contextFor({ role: 'Contract_Manager' })),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
