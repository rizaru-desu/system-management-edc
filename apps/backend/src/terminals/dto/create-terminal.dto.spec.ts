import { BadRequestException } from '@nestjs/common';
import { parseCreateTerminalDto } from './create-terminal.dto';
import { parseUpdateTerminalDto } from './update-terminal.dto';

describe('parseCreateTerminalDto', () => {
  const minimal = {
    serialNumber: 'PAX-2401-00021',
    productId: 'prd-1',
    condition: 'NEW',
    enteredSystemAt: '2026-05-06',
  };

  it('accepts a minimal body and fills defaults/nulls', () => {
    const dto = parseCreateTerminalDto(minimal);
    expect(dto).toEqual({
      ...minimal,
      warehouseId: null,
      status: 'IN_STOCK',
      merchantId: null,
      projectId: null,
      notes: null,
    });
  });

  it('normalizes empty optional strings to null and trims the serial', () => {
    const dto = parseCreateTerminalDto({
      ...minimal,
      serialNumber: '  PAX-2401-00021 ',
      warehouseId: '',
      merchantId: '',
      notes: '',
    });
    expect(dto.serialNumber).toBe('PAX-2401-00021');
    expect(dto.warehouseId).toBeNull();
    expect(dto.merchantId).toBeNull();
    expect(dto.notes).toBeNull();
  });

  it('rejects missing required fields and unknown enums', () => {
    for (const field of [
      'serialNumber',
      'productId',
      'condition',
      'enteredSystemAt',
    ]) {
      const body: Record<string, unknown> = { ...minimal };
      delete body[field];
      expect(() => parseCreateTerminalDto(body)).toThrow(BadRequestException);
    }
    expect(() =>
      parseCreateTerminalDto({ ...minimal, status: 'LOST' }),
    ).toThrow(BadRequestException);
    expect(() =>
      parseCreateTerminalDto({ ...minimal, condition: 'USED' }),
    ).toThrow(BadRequestException);
  });

  it('rejects a non-date enteredSystemAt', () => {
    expect(() =>
      parseCreateTerminalDto({ ...minimal, enteredSystemAt: '06-05-2026' }),
    ).toThrow(BadRequestException);
  });
});

describe('parseUpdateTerminalDto', () => {
  it('accepts any subset of fields', () => {
    expect(parseUpdateTerminalDto({ status: 'IN_TRANSIT' })).toEqual({
      status: 'IN_TRANSIT',
    });
    expect(parseUpdateTerminalDto({ warehouseId: null })).toEqual({
      warehouseId: null,
    });
  });

  it('rejects an empty body', () => {
    expect(() => parseUpdateTerminalDto({})).toThrow(BadRequestException);
  });

  it('never sneaks a status default into a partial update', () => {
    expect(parseUpdateTerminalDto({ notes: 'checked' })).toEqual({
      notes: 'checked',
    });
  });
});
