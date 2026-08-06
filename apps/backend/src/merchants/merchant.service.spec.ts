import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import {
  createMerchant,
  findMerchantById,
  listMerchants,
  softDeleteMerchant,
  updateMerchant,
} from '@repo/db';
import type { MerchantRow } from '@repo/db';
import { MerchantService } from './merchant.service';

jest.mock('@repo/db', () => ({
  createMerchant: jest.fn(),
  findMerchantById: jest.fn(),
  listMerchants: jest.fn(),
  softDeleteMerchant: jest.fn(),
  updateMerchant: jest.fn(),
}));

const listMock = listMerchants as jest.MockedFunction<typeof listMerchants>;
const findMock = findMerchantById as jest.MockedFunction<
  typeof findMerchantById
>;
const createMock = createMerchant as jest.MockedFunction<typeof createMerchant>;
const updateMock = updateMerchant as jest.MockedFunction<typeof updateMerchant>;
const deleteMock = softDeleteMerchant as jest.MockedFunction<
  typeof softDeleteMerchant
>;

const merchant: MerchantRow = {
  id: 'mch1',
  merchantCode: 'MCH-001',
  merchantName: 'Indomaret Pondok Aren',
  merchantType: 'Convenience Store',
  picName: 'Budi Santoso',
  phoneNumber: '+62 812 9001 1201',
  email: null,
  address: null,
  province: null,
  city: null,
  district: null,
  postalCode: null,
  latitude: null,
  longitude: null,
  servicePointId: 'sp1',
  servicePointCode: 'JKT-SEL',
  servicePointName: 'Jakarta Selatan',
  status: 'ACTIVE',
  createdAt: new Date('2026-08-01T00:00:00Z'),
  updatedAt: new Date('2026-08-01T00:00:00Z'),
};

const input = {
  merchantCode: 'MCH-001',
  merchantName: 'Indomaret Pondok Aren',
  merchantType: 'Convenience Store',
  picName: 'Budi Santoso',
  phoneNumber: '+62 812 9001 1201',
  email: null,
  address: null,
  province: null,
  city: null,
  district: null,
  postalCode: null,
  latitude: null,
  longitude: null,
  servicePointId: 'sp1',
  status: 'ACTIVE' as const,
};

describe('MerchantService', () => {
  let service: MerchantService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new MerchantService();
  });

  describe('list', () => {
    it('passes pagination, search, filter and sort options through', async () => {
      const page = { merchants: [merchant], total: 1 };
      listMock.mockResolvedValue(page);

      const options = {
        search: 'indo',
        status: 'ACTIVE' as const,
        servicePointId: 'sp1',
        sortBy: 'merchantName' as const,
        sortOrder: 'asc' as const,
        page: 2,
        pageSize: 25,
      };
      await expect(service.list(options)).resolves.toBe(page);
      expect(listMock).toHaveBeenCalledWith(options);
    });
  });

  describe('get', () => {
    it('returns the merchant when found', async () => {
      findMock.mockResolvedValue(merchant);
      await expect(service.get('mch1')).resolves.toBe(merchant);
    });

    it('throws 404 when unknown or soft-deleted', async () => {
      findMock.mockResolvedValue(null);
      await expect(service.get('nope')).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    it('returns the created merchant', async () => {
      createMock.mockResolvedValue({ ok: true, merchant });
      await expect(service.create(input)).resolves.toBe(merchant);
      expect(createMock).toHaveBeenCalledWith(input);
    });

    it('throws 409 on a duplicate merchantCode', async () => {
      createMock.mockResolvedValue({ ok: false, error: 'code-taken' });
      await expect(service.create(input)).rejects.toThrow(ConflictException);
    });

    it('throws 400 on an unknown servicePointId', async () => {
      createMock.mockResolvedValue({
        ok: false,
        error: 'service-point-not-found',
      });
      await expect(service.create(input)).rejects.toThrow(BadRequestException);
    });
  });

  describe('update', () => {
    it('returns the updated merchant', async () => {
      updateMock.mockResolvedValue({ ok: true, merchant });
      await expect(
        service.update('mch1', { merchantName: 'Renamed' }),
      ).resolves.toBe(merchant);
      expect(updateMock).toHaveBeenCalledWith('mch1', {
        merchantName: 'Renamed',
      });
    });

    it('throws 409 on a duplicate merchantCode', async () => {
      updateMock.mockResolvedValue({ ok: false, error: 'code-taken' });
      await expect(
        service.update('mch1', { merchantCode: 'MCH-002' }),
      ).rejects.toThrow(ConflictException);
    });

    it('throws 400 on an unknown servicePointId', async () => {
      updateMock.mockResolvedValue({
        ok: false,
        error: 'service-point-not-found',
      });
      await expect(
        service.update('mch1', { servicePointId: 'nope' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws 404 when the merchant does not exist', async () => {
      updateMock.mockResolvedValue({ ok: false, error: 'not-found' });
      await expect(
        service.update('nope', { merchantName: 'X' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('soft-deletes and returns the id', async () => {
      deleteMock.mockResolvedValue({ ok: true });
      await expect(service.remove('mch1')).resolves.toEqual({ id: 'mch1' });
      expect(deleteMock).toHaveBeenCalledWith('mch1');
    });

    it('throws 404 when the merchant does not exist', async () => {
      deleteMock.mockResolvedValue({ ok: false, error: 'not-found' });
      await expect(service.remove('nope')).rejects.toThrow(NotFoundException);
    });
  });
});
