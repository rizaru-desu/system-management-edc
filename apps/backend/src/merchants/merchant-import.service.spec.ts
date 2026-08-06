import { ConflictException } from '@nestjs/common';
import {
  findExistingMerchantCodes,
  insertMerchants,
  listAllServicePoints,
} from '@repo/db';
import type { ServicePointRow } from '@repo/db';
import { MerchantImportService } from './merchant-import.service';

jest.mock('@repo/db', () => ({
  findExistingMerchantCodes: jest.fn(),
  insertMerchants: jest.fn(),
  listAllServicePoints: jest.fn(),
}));

const existingCodesMock = findExistingMerchantCodes as jest.MockedFunction<
  typeof findExistingMerchantCodes
>;
const insertMock = insertMerchants as jest.MockedFunction<
  typeof insertMerchants
>;
const listServicePointsMock = listAllServicePoints as jest.MockedFunction<
  typeof listAllServicePoints
>;

function servicePoint(overrides: Partial<ServicePointRow>): ServicePointRow {
  return {
    id: 'sp1',
    parentId: null,
    code: 'SP-1',
    name: 'Jakarta Selatan',
    region: null,
    address: null,
    phone: null,
    email: null,
    latitude: -6.26,
    longitude: 106.81,
    coverageRadiusKm: null,
    notes: null,
    status: 'ACTIVE',
    assignedUsers: 0,
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
    ...overrides,
  };
}

/** A row that passes every validation and lands near sp1. */
const validRow = {
  merchantCode: 'MCH-001',
  merchantName: 'Indomaret Pondok Aren',
  latitude: -6.27,
  longitude: 106.82,
};

describe('MerchantImportService', () => {
  let service: MerchantImportService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new MerchantImportService();
    existingCodesMock.mockResolvedValue([]);
    listServicePointsMock.mockResolvedValue([servicePoint({})]);
    insertMock.mockResolvedValue({ ok: true, inserted: 1 });
  });

  describe('preview — validation', () => {
    it('accepts a valid row and assigns the nearest service point', async () => {
      const { rows, summary } = await service.preview([validRow]);
      expect(rows[0].errors).toEqual([]);
      expect(rows[0].assignmentStatus).toBe('ASSIGNED');
      expect(rows[0].nearestServicePointName).toBe('Jakarta Selatan');
      expect(rows[0].distanceKm).toBeGreaterThan(0);
      expect(rows[0].rowNumber).toBe(2);
      expect(summary).toEqual({
        totalRows: 1,
        validRows: 1,
        invalidRows: 0,
        assigned: 1,
        needManualAssignment: 0,
      });
    });

    it('rejects missing code, name and coordinates', async () => {
      const { rows } = await service.preview([{}]);
      expect(rows[0].errors).toEqual(
        expect.arrayContaining([
          'Merchant Code is required.',
          'Merchant Name is required.',
          'Latitude is required.',
          'Longitude is required.',
        ]),
      );
      expect(rows[0].assignmentStatus).toBeNull();
    });

    it('rejects non-numeric and out-of-range coordinates', async () => {
      const { rows } = await service.preview([
        { ...validRow, latitude: 'abc' },
        { ...validRow, merchantCode: 'MCH-002', longitude: 'not-a-number' },
        { ...validRow, merchantCode: 'MCH-003', latitude: 91 },
        { ...validRow, merchantCode: 'MCH-004', longitude: -180.5 },
      ]);
      expect(rows[0].errors).toContain('Invalid Latitude format.');
      expect(rows[1].errors).toContain('Invalid Longitude format.');
      expect(rows[2].errors).toContain('Latitude must be between -90 and 90.');
      expect(rows[3].errors).toContain(
        'Longitude must be between -180 and 180.',
      );
    });

    it('accepts trimmed decimal strings as coordinates', async () => {
      const { rows } = await service.preview([
        { ...validRow, latitude: ' -6.27 ', longitude: ' 106.82 ' },
      ]);
      expect(rows[0].errors).toEqual([]);
      expect(rows[0].latitude).toBe(-6.27);
      expect(rows[0].longitude).toBe(106.82);
    });

    it('flags duplicate codes within the file', async () => {
      const { rows, summary } = await service.preview([
        validRow,
        { ...validRow, merchantName: 'Second store' },
      ]);
      for (const row of rows) {
        expect(row.errors).toContain(
          'Duplicate Merchant Code within the uploaded file.',
        );
      }
      expect(summary.invalidRows).toBe(2);
    });

    it('flags codes that already exist in the database (one bulk query)', async () => {
      existingCodesMock.mockResolvedValue(['MCH-001']);
      const { rows } = await service.preview([validRow]);
      expect(rows[0].errors).toContain('Merchant Code already exists.');
      expect(existingCodesMock).toHaveBeenCalledTimes(1);
    });

    it('flags invalid phone, email and postal formats', async () => {
      const { rows } = await service.preview([
        {
          ...validRow,
          phoneNumber: 'call-me',
          email: 'nope',
          postalCode: '12',
        },
      ]);
      expect(rows[0].errors).toEqual(
        expect.arrayContaining([
          'Invalid Phone Number format.',
          'Invalid Email format.',
          'Postal Code must be 5 digits.',
        ]),
      );
    });
  });

  describe('preview — assignment', () => {
    it('loads the service point list once for the whole batch', async () => {
      await service.preview([
        validRow,
        { ...validRow, merchantCode: 'MCH-002' },
        { ...validRow, merchantCode: 'MCH-003' },
      ]);
      expect(listServicePointsMock).toHaveBeenCalledTimes(1);
    });

    it('marks rows outside a configured coverage radius for manual assignment', async () => {
      listServicePointsMock.mockResolvedValue([
        // ~116 km from the row's coordinates, radius 50 km.
        servicePoint({
          latitude: -6.9025,
          longitude: 107.6191,
          coverageRadiusKm: 50,
        }),
      ]);
      const { rows, summary } = await service.preview([validRow]);
      expect(rows[0].errors).toEqual([]);
      expect(rows[0].assignmentStatus).toBe('OUTSIDE_COVERAGE_RADIUS');
      expect(summary.assigned).toBe(0);
      expect(summary.needManualAssignment).toBe(1);
    });

    it('ignores INACTIVE service points and ones without coordinates', async () => {
      listServicePointsMock.mockResolvedValue([
        servicePoint({ id: 'inactive', status: 'INACTIVE' }),
        servicePoint({ id: 'no-coords', latitude: null, longitude: null }),
      ]);
      const { rows } = await service.preview([validRow]);
      expect(rows[0].assignmentStatus).toBe('NO_ACTIVE_SERVICE_POINT');
      expect(rows[0].nearestServicePointName).toBeNull();
    });
  });

  describe('import', () => {
    it('inserts only the valid, automatically assigned rows', async () => {
      listServicePointsMock.mockResolvedValue([
        servicePoint({ coverageRadiusKm: 50 }),
      ]);
      insertMock.mockResolvedValue({ ok: true, inserted: 1 });

      const result = await service.import([
        validRow,
        { merchantName: 'No code', latitude: -6.27, longitude: 106.82 },
        {
          ...validRow,
          merchantCode: 'MCH-FAR',
          latitude: -8.65, // Bali — far outside the 50 km radius.
          longitude: 115.21,
        },
      ]);

      expect(insertMock).toHaveBeenCalledTimes(1);
      const inputs = insertMock.mock.calls[0][0];
      expect(inputs).toHaveLength(1);
      expect(inputs[0]).toMatchObject({
        merchantCode: 'MCH-001',
        servicePointId: 'sp1',
        status: 'ACTIVE',
      });
      expect(inputs[0].distanceToServicePointKm).toBeGreaterThan(0);
      expect(result).toEqual({
        imported: 1,
        invalidRows: 1,
        needManualAssignment: 1,
      });
    });

    it('surfaces a concurrent duplicate as a conflict', async () => {
      insertMock.mockResolvedValue({
        ok: false,
        error: 'duplicate-codes',
        codes: ['MCH-001'],
      });
      await expect(service.import([validRow])).rejects.toThrow(
        ConflictException,
      );
    });
  });
});
