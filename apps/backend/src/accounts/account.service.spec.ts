import { ConflictException, NotFoundException } from '@nestjs/common';
import {
  createAccount,
  findAccountById,
  listAccounts,
  softDeleteAccount,
  updateAccount,
} from '@repo/db';
import type { AccountRow } from '@repo/db';
import { AccountService } from './account.service';

jest.mock('@repo/db', () => ({
  createAccount: jest.fn(),
  findAccountById: jest.fn(),
  listAccounts: jest.fn(),
  softDeleteAccount: jest.fn(),
  updateAccount: jest.fn(),
}));

const listMock = listAccounts as jest.MockedFunction<typeof listAccounts>;
const findMock = findAccountById as jest.MockedFunction<typeof findAccountById>;
const createMock = createAccount as jest.MockedFunction<typeof createAccount>;
const updateMock = updateAccount as jest.MockedFunction<typeof updateAccount>;
const deleteMock = softDeleteAccount as jest.MockedFunction<
  typeof softDeleteAccount
>;

const account: AccountRow = {
  id: 'acc1',
  accountId: 'ACC-0001',
  accountName: 'PT Maju Bersama',
  accountType: 'CORPORATE',
  status: 'ACTIVE',
  billingName: 'PT Maju Bersama Tbk',
  taxId: '01.234.567.8-901.000',
  billingAddress: 'Jl. Sudirman Kav. 10',
  city: 'Jakarta Selatan',
  region: 'DKI Jakarta',
  picName: 'Budi Santoso',
  picPhone: '+62 812 3456 7890',
  picEmail: 'budi.santoso@majubersama.co.id',
  contractLineCount: 2,
  createdAt: new Date('2026-08-01T00:00:00Z'),
  updatedAt: new Date('2026-08-01T00:00:00Z'),
};

const input = {
  accountId: 'ACC-0001',
  accountName: 'PT Maju Bersama',
  accountType: 'CORPORATE' as const,
  status: 'ACTIVE' as const,
  billingName: 'PT Maju Bersama Tbk',
  taxId: '01.234.567.8-901.000',
  billingAddress: 'Jl. Sudirman Kav. 10',
  city: 'Jakarta Selatan',
  region: 'DKI Jakarta',
  picName: 'Budi Santoso',
  picPhone: '+62 812 3456 7890',
  picEmail: 'budi.santoso@majubersama.co.id',
};

describe('AccountService', () => {
  let service: AccountService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new AccountService();
  });

  describe('list', () => {
    it('passes pagination, search, filter and sort options through', async () => {
      const page = { accounts: [account], total: 1 };
      listMock.mockResolvedValue(page);

      const options = {
        search: 'maju',
        accountType: 'CORPORATE' as const,
        status: 'ACTIVE' as const,
        sortBy: 'accountName' as const,
        sortOrder: 'asc' as const,
        page: 2,
        pageSize: 25,
      };
      await expect(service.list(options)).resolves.toBe(page);
      expect(listMock).toHaveBeenCalledWith(options);
    });
  });

  describe('get', () => {
    it('returns the account when found', async () => {
      findMock.mockResolvedValue(account);
      await expect(service.get('acc1')).resolves.toBe(account);
    });

    it('throws 404 when unknown or soft-deleted', async () => {
      findMock.mockResolvedValue(null);
      await expect(service.get('nope')).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    it('returns the created account', async () => {
      createMock.mockResolvedValue({ ok: true, account });
      await expect(service.create(input)).resolves.toBe(account);
      expect(createMock).toHaveBeenCalledWith(input);
    });

    it('throws 409 on a duplicate accountId', async () => {
      createMock.mockResolvedValue({ ok: false, error: 'account-id-taken' });
      await expect(service.create(input)).rejects.toThrow(ConflictException);
    });
  });

  describe('update', () => {
    it('returns the updated account', async () => {
      updateMock.mockResolvedValue({ ok: true, account });
      await expect(
        service.update('acc1', { accountName: 'Renamed' }),
      ).resolves.toBe(account);
      expect(updateMock).toHaveBeenCalledWith('acc1', {
        accountName: 'Renamed',
      });
    });

    it('throws 409 on a duplicate accountId', async () => {
      updateMock.mockResolvedValue({ ok: false, error: 'account-id-taken' });
      await expect(
        service.update('acc1', { accountId: 'ACC-0002' }),
      ).rejects.toThrow(ConflictException);
    });

    it('throws 404 when the account does not exist', async () => {
      updateMock.mockResolvedValue({ ok: false, error: 'not-found' });
      await expect(
        service.update('nope', { accountName: 'X' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('soft-deletes and returns the id', async () => {
      deleteMock.mockResolvedValue({ ok: true });
      await expect(service.remove('acc1')).resolves.toEqual({ id: 'acc1' });
      expect(deleteMock).toHaveBeenCalledWith('acc1');
    });

    it('throws 404 when the account does not exist', async () => {
      deleteMock.mockResolvedValue({ ok: false, error: 'not-found' });
      await expect(service.remove('nope')).rejects.toThrow(NotFoundException);
    });
  });
});
