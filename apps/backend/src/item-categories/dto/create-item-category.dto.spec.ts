import { BadRequestException } from '@nestjs/common';
import { parseCreateItemCategoryDto } from './create-item-category.dto';
import { parseUpdateItemCategoryDto } from './update-item-category.dto';

describe('parseCreateItemCategoryDto', () => {
  it('accepts a minimal body and fills defaults/nulls', () => {
    const dto = parseCreateItemCategoryDto({
      name: 'Charger/Adaptor',
      accessoryCategory: 'POWER',
      unit: 'PCS',
    });
    expect(dto).toEqual({
      name: 'Charger/Adaptor',
      code: null,
      accessoryCategory: 'POWER',
      unit: 'PCS',
      description: null,
      status: 'ACTIVE',
    });
  });

  it('normalizes empty optional strings to null and trims required ones', () => {
    const dto = parseCreateItemCategoryDto({
      name: '  Kabel USB ',
      code: '',
      accessoryCategory: 'KONEKTIVITAS',
      unit: 'PCS',
      description: '',
    });
    expect(dto.name).toBe('Kabel USB');
    expect(dto.code).toBeNull();
    expect(dto.description).toBeNull();
  });

  it('rejects a missing or blank name', () => {
    expect(() =>
      parseCreateItemCategoryDto({ accessoryCategory: 'POWER', unit: 'PCS' }),
    ).toThrow(BadRequestException);
    expect(() =>
      parseCreateItemCategoryDto({
        name: ' ',
        accessoryCategory: 'POWER',
        unit: 'PCS',
      }),
    ).toThrow(BadRequestException);
  });

  it('rejects unknown accessory categories and units', () => {
    expect(() =>
      parseCreateItemCategoryDto({
        name: 'X',
        accessoryCategory: 'GADGET',
        unit: 'PCS',
      }),
    ).toThrow(BadRequestException);
    expect(() =>
      parseCreateItemCategoryDto({
        name: 'X',
        accessoryCategory: 'POWER',
        unit: 'BOX',
      }),
    ).toThrow(BadRequestException);
  });
});

describe('parseUpdateItemCategoryDto', () => {
  it('accepts any subset of fields', () => {
    expect(parseUpdateItemCategoryDto({ status: 'INACTIVE' })).toEqual({
      status: 'INACTIVE',
    });
    expect(parseUpdateItemCategoryDto({ code: null })).toEqual({ code: null });
  });

  it('rejects an empty body', () => {
    expect(() => parseUpdateItemCategoryDto({})).toThrow(BadRequestException);
  });

  it('never sneaks a status default into a partial update', () => {
    expect(parseUpdateItemCategoryDto({ name: 'SIM Card' })).toEqual({
      name: 'SIM Card',
    });
  });
});
