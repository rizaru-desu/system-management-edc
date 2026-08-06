import { BadRequestException } from '@nestjs/common';
import { parseCreateMerchantDto } from './create-merchant.dto';
import { parseMerchantFilterDto } from './merchant-filter.dto';
import { parseUpdateMerchantDto } from './update-merchant.dto';

describe('parseCreateMerchantDto', () => {
  it('accepts a minimal body and fills defaults/nulls', () => {
    const dto = parseCreateMerchantDto({
      merchantCode: 'MCH-001',
      merchantName: 'Indomaret Pondok Aren',
      servicePointId: 'sp1',
    });
    expect(dto).toEqual({
      merchantCode: 'MCH-001',
      merchantName: 'Indomaret Pondok Aren',
      merchantType: null,
      picName: null,
      phoneNumber: null,
      email: null,
      address: null,
      province: null,
      city: null,
      district: null,
      postalCode: null,
      latitude: null,
      longitude: null,
      servicePointId: 'sp1',
      status: 'ACTIVE',
    });
  });

  it('normalizes empty optional strings to null and trims required ones', () => {
    const dto = parseCreateMerchantDto({
      merchantCode: '  MCH-002 ',
      merchantName: ' Alfamart BSD ',
      merchantType: '',
      email: '',
      phoneNumber: '',
      postalCode: '',
      servicePointId: 'sp1',
    });
    expect(dto.merchantCode).toBe('MCH-002');
    expect(dto.merchantName).toBe('Alfamart BSD');
    expect(dto.merchantType).toBeNull();
    expect(dto.email).toBeNull();
    expect(dto.phoneNumber).toBeNull();
    expect(dto.postalCode).toBeNull();
  });

  it('rejects a missing merchantCode, merchantName or servicePointId', () => {
    expect(() =>
      parseCreateMerchantDto({ merchantName: 'X', servicePointId: 'sp1' }),
    ).toThrow(BadRequestException);
    expect(() =>
      parseCreateMerchantDto({
        merchantCode: 'X',
        merchantName: ' ',
        servicePointId: 'sp1',
      }),
    ).toThrow(BadRequestException);
    expect(() =>
      parseCreateMerchantDto({ merchantCode: 'X', merchantName: 'X' }),
    ).toThrow(BadRequestException);
  });

  it('accepts valid phone formats and rejects invalid ones', () => {
    const dto = parseCreateMerchantDto({
      merchantCode: 'X',
      merchantName: 'X',
      servicePointId: 'sp1',
      phoneNumber: '+62 812 3456 7890',
    });
    expect(dto.phoneNumber).toBe('+62 812 3456 7890');

    expect(() =>
      parseCreateMerchantDto({
        merchantCode: 'X',
        merchantName: 'X',
        servicePointId: 'sp1',
        phoneNumber: 'call-me-maybe',
      }),
    ).toThrow(BadRequestException);
    expect(() =>
      parseCreateMerchantDto({
        merchantCode: 'X',
        merchantName: 'X',
        servicePointId: 'sp1',
        phoneNumber: '+62 123',
      }),
    ).toThrow(BadRequestException);
  });

  it('rejects invalid email, postal code and out-of-range coordinates', () => {
    const base = {
      merchantCode: 'X',
      merchantName: 'X',
      servicePointId: 'sp1',
    };
    expect(() => parseCreateMerchantDto({ ...base, email: 'nope' })).toThrow(
      BadRequestException,
    );
    expect(() => parseCreateMerchantDto({ ...base, postalCode: '12' })).toThrow(
      BadRequestException,
    );
    expect(() => parseCreateMerchantDto({ ...base, latitude: 91 })).toThrow(
      BadRequestException,
    );
    expect(() => parseCreateMerchantDto({ ...base, longitude: -181 })).toThrow(
      BadRequestException,
    );
    expect(() => parseCreateMerchantDto({ ...base, latitude: '-6.2' })).toThrow(
      BadRequestException,
    );
  });

  it('rejects an unknown status', () => {
    expect(() =>
      parseCreateMerchantDto({
        merchantCode: 'X',
        merchantName: 'X',
        servicePointId: 'sp1',
        status: 'PAUSED',
      }),
    ).toThrow(BadRequestException);
  });
});

describe('parseUpdateMerchantDto', () => {
  it('keeps omitted fields absent (no default injection on PATCH)', () => {
    const dto = parseUpdateMerchantDto({ merchantName: 'Renamed' });
    expect(dto).toEqual({ merchantName: 'Renamed' });
    expect('status' in dto).toBe(false);
    expect('servicePointId' in dto).toBe(false);
  });

  it('rejects an empty patch', () => {
    expect(() => parseUpdateMerchantDto({})).toThrow(BadRequestException);
  });
});

describe('parseMerchantFilterDto', () => {
  it('coerces pagination numbers and passes filters through', () => {
    const dto = parseMerchantFilterDto({
      search: 'indo',
      status: 'ACTIVE',
      servicePointId: 'sp1',
      sortBy: 'merchantName',
      sortOrder: 'asc',
      page: '2',
      pageSize: '25',
    });
    expect(dto).toEqual({
      search: 'indo',
      status: 'ACTIVE',
      servicePointId: 'sp1',
      sortBy: 'merchantName',
      sortOrder: 'asc',
      page: 2,
      pageSize: 25,
    });
  });

  it('accepts an empty query', () => {
    expect(parseMerchantFilterDto(undefined)).toEqual({});
  });

  it('rejects unknown sort fields and orders (ORDER BY whitelist)', () => {
    expect(() => parseMerchantFilterDto({ sortBy: 'deletedAt' })).toThrow(
      BadRequestException,
    );
    expect(() => parseMerchantFilterDto({ sortOrder: 'sideways' })).toThrow(
      BadRequestException,
    );
  });

  it('rejects a non-positive page', () => {
    expect(() => parseMerchantFilterDto({ page: '0' })).toThrow(
      BadRequestException,
    );
  });
});
