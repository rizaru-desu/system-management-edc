import { PermissionsService } from './permissions.service';
import { listRolePermissions, replaceRolePermissions } from '@repo/db';
import type { RolePermissionEntry } from '@repo/db';

jest.mock('@repo/db', () => ({
  listRolePermissions: jest.fn(),
  replaceRolePermissions: jest.fn(),
}));

const listMock = listRolePermissions as jest.MockedFunction<
  typeof listRolePermissions
>;
const replaceMock = replaceRolePermissions as jest.MockedFunction<
  typeof replaceRolePermissions
>;

function row(
  role: string,
  module: string,
  flags: Partial<Omit<RolePermissionEntry, 'role' | 'module'>> = {},
): RolePermissionEntry {
  return {
    role,
    module,
    canView: false,
    canCreate: false,
    canUpdate: false,
    canDelete: false,
    ...flags,
  };
}

describe('PermissionsService', () => {
  let service: PermissionsService;

  beforeEach(() => {
    jest.clearAllMocks();
    listMock.mockResolvedValue([
      row('Operations_Specialist', 'terminals', {
        canView: true,
        canCreate: true,
      }),
      row('Inventory_Controller', 'stock', { canView: true, canUpdate: true }),
    ]);
    replaceMock.mockResolvedValue(undefined);
    service = new PermissionsService();
  });

  describe('hasPermission', () => {
    it('always grants System_Administrator without querying storage', async () => {
      await expect(
        service.hasPermission(['System_Administrator'], 'anything', 'delete'),
      ).resolves.toBe(true);
      expect(listMock).not.toHaveBeenCalled();
    });

    it('denies users without roles without querying storage', async () => {
      await expect(
        service.hasPermission([], 'terminals', 'view'),
      ).resolves.toBe(false);
      expect(listMock).not.toHaveBeenCalled();
    });

    it('grants a stored action and denies a missing one', async () => {
      const roles = ['Operations_Specialist'];
      await expect(
        service.hasPermission(roles, 'terminals', 'view'),
      ).resolves.toBe(true);
      await expect(
        service.hasPermission(roles, 'terminals', 'delete'),
      ).resolves.toBe(false);
      await expect(service.hasPermission(roles, 'stock', 'view')).resolves.toBe(
        false,
      );
    });

    it('reuses the cached matrix across checks', async () => {
      await service.hasPermission(
        ['Operations_Specialist'],
        'terminals',
        'view',
      );
      await service.hasPermission(['Inventory_Controller'], 'stock', 'update');
      expect(listMock).toHaveBeenCalledTimes(1);
    });

    it('retries after a failed matrix load', async () => {
      listMock.mockRejectedValueOnce(new Error('db down'));
      await expect(
        service.hasPermission(['Operations_Specialist'], 'terminals', 'view'),
      ).rejects.toThrow('db down');
      await expect(
        service.hasPermission(['Operations_Specialist'], 'terminals', 'view'),
      ).resolves.toBe(true);
      expect(listMock).toHaveBeenCalledTimes(2);
    });
  });

  describe('saveMatrix', () => {
    it('strips System_Administrator and invalidates the cache', async () => {
      await service.hasPermission(
        ['Operations_Specialist'],
        'terminals',
        'view',
      );
      expect(listMock).toHaveBeenCalledTimes(1);

      await service.saveMatrix({
        System_Administrator: {
          terminals: { view: true, create: true, update: true, delete: true },
        },
        Contract_Manager: {
          contracts: {
            view: true,
            create: false,
            update: false,
            delete: false,
          },
        },
      });

      expect(replaceMock).toHaveBeenCalledWith([
        row('Contract_Manager', 'contracts', { canView: true }),
      ]);

      // saveMatrix re-reads once for its return value; the next permission
      // check must load again instead of reusing the pre-save cache.
      const callsAfterSave = listMock.mock.calls.length;
      await service.hasPermission(
        ['Operations_Specialist'],
        'terminals',
        'view',
      );
      expect(listMock).toHaveBeenCalledTimes(callsAfterSave + 1);
    });
  });

  describe('getEffectivePermissions', () => {
    it('short-circuits for System Administrators', async () => {
      await expect(
        service.getEffectivePermissions(['System_Administrator']),
      ).resolves.toEqual({
        roles: ['System_Administrator'],
        systemAdministrator: true,
        modules: {},
      });
      expect(listMock).not.toHaveBeenCalled();
    });

    it('unions grants across roles per module', async () => {
      listMock.mockResolvedValue([
        row('A', 'terminals', { canView: true }),
        row('B', 'terminals', { canUpdate: true }),
        row('B', 'stock', { canView: true }),
      ]);

      await expect(
        service.getEffectivePermissions(['A', 'B']),
      ).resolves.toEqual({
        roles: ['A', 'B'],
        systemAdministrator: false,
        modules: {
          terminals: { view: true, create: false, update: true, delete: false },
          stock: { view: true, create: false, update: false, delete: false },
        },
      });
    });
  });
});
