import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import {
  createContractLine,
  findContractLineById,
  listContractLines,
  softDeleteContractLine,
  updateContractLine,
} from '@repo/db';
import type { ContractLineRow } from '@repo/db';
import { ContractLineService } from './contract-line.service';

jest.mock('@repo/db', () => ({
  createContractLine: jest.fn(),
  findContractLineById: jest.fn(),
  listContractLines: jest.fn(),
  softDeleteContractLine: jest.fn(),
  updateContractLine: jest.fn(),
}));

const listMock = listContractLines as jest.MockedFunction<
  typeof listContractLines
>;
const findMock = findContractLineById as jest.MockedFunction<
  typeof findContractLineById
>;
const createMock = createContractLine as jest.MockedFunction<
  typeof createContractLine
>;
const updateMock = updateContractLine as jest.MockedFunction<
  typeof updateContractLine
>;
const deleteMock = softDeleteContractLine as jest.MockedFunction<
  typeof softDeleteContractLine
>;

const contractLine: ContractLineRow = {
  id: 'cl1',
  lineNumber: 'CL-2026-0001',
  lineName: 'Jabodetabek Master Terminal Lease',
  status: 'ACTIVE',
  documentStatus: 'SIGNED',
  vendorEdc: 'Ingenico',
  accountId: 'acc1',
  accountCode: 'ACC-0001',
  accountName: 'PT Maju Bersama',
  projectId: 'prj1',
  projectCode: 'PRJ-0001',
  projectName: 'EDC Rollout Jabodetabek',
  serviceItem: 'Terminal lease — Move/2500',
  startDate: '2026-01-01',
  endDate: '2026-12-31',
  notes: null,
  createdAt: new Date('2026-08-01T00:00:00Z'),
  updatedAt: new Date('2026-08-01T00:00:00Z'),
};

const input = {
  lineNumber: 'CL-2026-0001',
  lineName: 'Jabodetabek Master Terminal Lease',
  status: 'ACTIVE' as const,
  documentStatus: 'SIGNED' as const,
  vendorEdc: 'Ingenico',
  accountId: 'acc1',
  projectId: 'prj1',
  serviceItem: 'Terminal lease — Move/2500',
  startDate: '2026-01-01',
  endDate: '2026-12-31',
  notes: null,
};

describe('ContractLineService', () => {
  let service: ContractLineService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new ContractLineService();
  });

  describe('list', () => {
    it('passes pagination, search, filter and sort options through', async () => {
      const page = { contractLines: [contractLine], total: 1 };
      listMock.mockResolvedValue(page);

      const options = {
        search: 'lease',
        status: 'ACTIVE' as const,
        documentStatus: 'SIGNED' as const,
        accountId: 'acc1',
        projectId: 'prj1',
        sortBy: 'lineName' as const,
        sortOrder: 'asc' as const,
        page: 2,
        pageSize: 25,
      };
      await expect(service.list(options)).resolves.toBe(page);
      expect(listMock).toHaveBeenCalledWith(options);
    });
  });

  describe('get', () => {
    it('returns the contract line when found', async () => {
      findMock.mockResolvedValue(contractLine);
      await expect(service.get('cl1')).resolves.toBe(contractLine);
    });

    it('throws 404 when unknown or soft-deleted', async () => {
      findMock.mockResolvedValue(null);
      await expect(service.get('nope')).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    it('returns the created contract line', async () => {
      createMock.mockResolvedValue({ ok: true, contractLine });
      await expect(service.create(input)).resolves.toBe(contractLine);
      expect(createMock).toHaveBeenCalledWith(input);
    });

    it('throws 409 on a duplicate lineNumber', async () => {
      createMock.mockResolvedValue({ ok: false, error: 'line-number-taken' });
      await expect(service.create(input)).rejects.toThrow(ConflictException);
    });

    it('throws 400 on an unknown accountId', async () => {
      createMock.mockResolvedValue({ ok: false, error: 'account-not-found' });
      await expect(service.create(input)).rejects.toThrow(BadRequestException);
    });

    it('throws 400 on an unknown projectId', async () => {
      createMock.mockResolvedValue({ ok: false, error: 'project-not-found' });
      await expect(service.create(input)).rejects.toThrow(BadRequestException);
    });
  });

  describe('update', () => {
    it('returns the updated contract line', async () => {
      updateMock.mockResolvedValue({ ok: true, contractLine });
      await expect(
        service.update('cl1', { lineName: 'Renamed' }),
      ).resolves.toBe(contractLine);
      expect(updateMock).toHaveBeenCalledWith('cl1', { lineName: 'Renamed' });
    });

    it('throws 409 on a duplicate lineNumber', async () => {
      updateMock.mockResolvedValue({ ok: false, error: 'line-number-taken' });
      await expect(
        service.update('cl1', { lineNumber: 'CL-2026-0002' }),
      ).rejects.toThrow(ConflictException);
    });

    it('throws 400 on an unknown accountId', async () => {
      updateMock.mockResolvedValue({ ok: false, error: 'account-not-found' });
      await expect(
        service.update('cl1', { accountId: 'nope' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws 404 when the contract line does not exist', async () => {
      updateMock.mockResolvedValue({ ok: false, error: 'not-found' });
      await expect(service.update('nope', { lineName: 'X' })).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('remove', () => {
    it('soft-deletes and returns the id', async () => {
      deleteMock.mockResolvedValue({ ok: true });
      await expect(service.remove('cl1')).resolves.toEqual({ id: 'cl1' });
      expect(deleteMock).toHaveBeenCalledWith('cl1');
    });

    it('throws 404 when the contract line does not exist', async () => {
      deleteMock.mockResolvedValue({ ok: false, error: 'not-found' });
      await expect(service.remove('nope')).rejects.toThrow(NotFoundException);
    });
  });
});
