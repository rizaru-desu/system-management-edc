import { BadRequestException } from '@nestjs/common';
import { parseCreateServicePointDto } from './create-service-point.dto';
import { parseUpdateServicePointDto } from './update-service-point.dto';

describe('parseCreateServicePointDto', () => {
  it('accepts a minimal body and fills defaults/nulls', () => {
    const dto = parseCreateServicePointDto({ code: 'JKT', name: 'Jakarta' });
    expect(dto).toEqual({
      code: 'JKT',
      name: 'Jakarta',
      parentId: null,
      region: null,
      address: null,
      phone: null,
      email: null,
      latitude: null,
      longitude: null,
      notes: null,
      status: 'ACTIVE',
    });
  });

  it('normalizes empty optional strings to null and trims required ones', () => {
    const dto = parseCreateServicePointDto({
      code: '  JKT-SEL ',
      name: ' Jakarta Selatan ',
      region: '',
      email: '',
    });
    expect(dto.code).toBe('JKT-SEL');
    expect(dto.name).toBe('Jakarta Selatan');
    expect(dto.region).toBeNull();
    expect(dto.email).toBeNull();
  });

  it('rejects a missing code or name', () => {
    expect(() => parseCreateServicePointDto({ name: 'X' })).toThrow(
      BadRequestException,
    );
    expect(() => parseCreateServicePointDto({ code: 'X', name: ' ' })).toThrow(
      BadRequestException,
    );
  });

  it('rejects invalid email and out-of-range coordinates', () => {
    expect(() =>
      parseCreateServicePointDto({ code: 'X', name: 'X', email: 'nope' }),
    ).toThrow(BadRequestException);
    expect(() =>
      parseCreateServicePointDto({ code: 'X', name: 'X', latitude: 91 }),
    ).toThrow(BadRequestException);
    expect(() =>
      parseCreateServicePointDto({ code: 'X', name: 'X', longitude: -181 }),
    ).toThrow(BadRequestException);
  });

  it('rejects an unknown status', () => {
    expect(() =>
      parseCreateServicePointDto({ code: 'X', name: 'X', status: 'PAUSED' }),
    ).toThrow(BadRequestException);
  });
});

describe('parseUpdateServicePointDto', () => {
  it('keeps omitted fields absent (no default injection on PATCH)', () => {
    const dto = parseUpdateServicePointDto({ name: 'Renamed' });
    expect(dto).toEqual({ name: 'Renamed' });
    expect('status' in dto).toBe(false);
    expect('parentId' in dto).toBe(false);
  });

  it('lets parentId: null move a service point to the top level', () => {
    expect(parseUpdateServicePointDto({ parentId: null })).toEqual({
      parentId: null,
    });
  });

  it('rejects an empty patch', () => {
    expect(() => parseUpdateServicePointDto({})).toThrow(BadRequestException);
  });
});
