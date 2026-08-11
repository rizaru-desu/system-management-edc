import { BadRequestException } from '@nestjs/common';
import { parseCreateProductDto } from './create-product.dto';
import { parseUpdateProductDto } from './update-product.dto';

describe('parseCreateProductDto', () => {
  const minimal = {
    modelName: 'PAX A920 Pro',
    brand: 'PAX Technology',
    category: 'MOBILE_EDC',
  };

  it('accepts a minimal body and fills defaults/nulls', () => {
    const dto = parseCreateProductDto(minimal);
    expect(dto).toEqual({
      ...minimal,
      description: null,
      photoUrl: null,
      status: 'ACTIVE',
      completenessItems: [],
    });
  });

  it('fills completeness row defaults (required=true, standardQty=1)', () => {
    const dto = parseCreateProductDto({
      ...minimal,
      completenessItems: [{ itemCategoryId: 'ic-1' }],
    });
    expect(dto.completenessItems).toEqual([
      { itemCategoryId: 'ic-1', required: true, standardQty: 1 },
    ]);
  });

  it('rejects missing required fields and unknown categories', () => {
    for (const field of ['modelName', 'brand', 'category']) {
      const body: Record<string, unknown> = { ...minimal };
      delete body[field];
      expect(() => parseCreateProductDto(body)).toThrow(BadRequestException);
    }
    expect(() =>
      parseCreateProductDto({ ...minimal, category: 'TABLET' }),
    ).toThrow(BadRequestException);
  });

  it('rejects duplicate completeness items and bad quantities', () => {
    expect(() =>
      parseCreateProductDto({
        ...minimal,
        completenessItems: [
          { itemCategoryId: 'ic-1' },
          { itemCategoryId: 'ic-1' },
        ],
      }),
    ).toThrow(BadRequestException);
    expect(() =>
      parseCreateProductDto({
        ...minimal,
        completenessItems: [{ itemCategoryId: 'ic-1', standardQty: 0 }],
      }),
    ).toThrow(BadRequestException);
    expect(() =>
      parseCreateProductDto({
        ...minimal,
        completenessItems: [{ itemCategoryId: 'ic-1', standardQty: 1.5 }],
      }),
    ).toThrow(BadRequestException);
  });
});

describe('parseUpdateProductDto', () => {
  it('accepts any subset of fields', () => {
    expect(parseUpdateProductDto({ status: 'INACTIVE' })).toEqual({
      status: 'INACTIVE',
    });
    expect(parseUpdateProductDto({ completenessItems: [] })).toEqual({
      completenessItems: [],
    });
  });

  it('rejects an empty body', () => {
    expect(() => parseUpdateProductDto({})).toThrow(BadRequestException);
  });

  it('never sneaks defaults into a partial update', () => {
    expect(parseUpdateProductDto({ brand: 'Sunmi' })).toEqual({
      brand: 'Sunmi',
    });
  });
});
