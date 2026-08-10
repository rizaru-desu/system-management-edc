import { BadRequestException } from '@nestjs/common';
import { parseCreateWarehouseDto } from './create-warehouse.dto';
import { parseEligibleParentsDto } from './eligible-parents.dto';
import { parseUpdateWarehouseDto } from './update-warehouse.dto';

describe('parseCreateWarehouseDto', () => {
  const minimal = {
    name: 'Gudang Pusat Jakarta',
    code: 'WH-CTR-JKT',
    type: 'CENTRAL',
    region: 'DKI Jakarta',
    address: 'Jl. Daan Mogot KM 11 No. 45',
    picName: 'Budi Santoso',
  };

  it('accepts a minimal body and fills defaults/nulls', () => {
    const dto = parseCreateWarehouseDto(minimal);
    expect(dto).toEqual({
      ...minimal,
      parentId: null,
      picContact: null,
      capacity: null,
      status: 'ACTIVE',
    });
  });

  it('normalizes empty optional strings to null and trims required ones', () => {
    const dto = parseCreateWarehouseDto({
      ...minimal,
      name: '  Gudang Pusat Jakarta ',
      picContact: '',
    });
    expect(dto.name).toBe('Gudang Pusat Jakarta');
    expect(dto.picContact).toBeNull();
  });

  it('rejects missing required fields', () => {
    for (const field of [
      'name',
      'code',
      'type',
      'region',
      'address',
      'picName',
    ]) {
      const body: Record<string, unknown> = { ...minimal };
      delete body[field];
      expect(() => parseCreateWarehouseDto(body)).toThrow(BadRequestException);
    }
  });

  it('rejects unknown types and non-positive/fractional capacity', () => {
    expect(() => parseCreateWarehouseDto({ ...minimal, type: 'MEGA' })).toThrow(
      BadRequestException,
    );
    expect(() => parseCreateWarehouseDto({ ...minimal, capacity: 0 })).toThrow(
      BadRequestException,
    );
    expect(() =>
      parseCreateWarehouseDto({ ...minimal, capacity: 12.5 }),
    ).toThrow(BadRequestException);
  });
});

describe('parseUpdateWarehouseDto', () => {
  it('accepts any subset of fields', () => {
    expect(parseUpdateWarehouseDto({ status: 'INACTIVE' })).toEqual({
      status: 'INACTIVE',
    });
    expect(parseUpdateWarehouseDto({ parentId: null })).toEqual({
      parentId: null,
    });
  });

  it('rejects an empty body', () => {
    expect(() => parseUpdateWarehouseDto({})).toThrow(BadRequestException);
  });

  it('never sneaks a status default into a partial update', () => {
    expect(parseUpdateWarehouseDto({ name: 'Gudang Baru' })).toEqual({
      name: 'Gudang Baru',
    });
  });
});

describe('parseEligibleParentsDto', () => {
  it('requires a valid type and passes excludeId through', () => {
    expect(parseEligibleParentsDto({ type: 'REGIONAL' })).toEqual({
      type: 'REGIONAL',
      excludeId: undefined,
    });
    expect(
      parseEligibleParentsDto({ type: 'SERVICE_POINT', excludeId: 'wh-1' }),
    ).toEqual({ type: 'SERVICE_POINT', excludeId: 'wh-1' });
    expect(() => parseEligibleParentsDto({})).toThrow(BadRequestException);
    expect(() => parseEligibleParentsDto({ type: 'MEGA' })).toThrow(
      BadRequestException,
    );
  });
});
