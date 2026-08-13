import { BadRequestException } from '@nestjs/common';
import { deriveEdcMovementType } from '@repo/db/schema';
import {
  parseListEdcMovementsDto,
  parseListPeripheralMovementsDto,
} from './list-stock-movements.dto';
import { parseStockLevelFiltersDto } from './stock-level-filters.dto';

describe('deriveEdcMovementType', () => {
  it('maps every named transition', () => {
    expect(deriveEdcMovementType(null, 'IN_STOCK')).toBe('INBOUND_RECEIPT');
    expect(deriveEdcMovementType('IN_STOCK', 'IN_TRANSIT')).toBe(
      'TRANSFER_OUT',
    );
    expect(deriveEdcMovementType('IN_TRANSIT', 'IN_STOCK')).toBe('TRANSFER_IN');
    expect(deriveEdcMovementType('IN_STOCK', 'INSTALLED')).toBe('INSTALLATION');
    expect(deriveEdcMovementType('INSTALLED', 'DAMAGED')).toBe(
      'MARKED_DAMAGED',
    );
    expect(deriveEdcMovementType('IN_STOCK', 'UNDER_MAINTENANCE')).toBe(
      'MAINTENANCE',
    );
    expect(deriveEdcMovementType('UNDER_MAINTENANCE', 'IN_STOCK')).toBe(
      'RETURNED_TO_STOCK',
    );
    expect(deriveEdcMovementType('DAMAGED', 'RETIRED')).toBe('RETIRED');
  });

  it('prefers the registration rule over the destination rules', () => {
    // A unit can enter the system directly as installed or in transit —
    // the first history row is always the receipt.
    expect(deriveEdcMovementType(null, 'INSTALLED')).toBe('INBOUND_RECEIPT');
    expect(deriveEdcMovementType(null, 'IN_TRANSIT')).toBe('INBOUND_RECEIPT');
  });
});

describe('parseListEdcMovementsDto', () => {
  it('coerces pagination and passes filters through', () => {
    const dto = parseListEdcMovementsDto({
      search: 'PAX',
      movementType: 'TRANSFER_OUT',
      dateFrom: '2026-08-01',
      dateTo: '2026-08-12',
      page: '2',
      pageSize: '25',
    });

    expect(dto.movementType).toBe('TRANSFER_OUT');
    expect(dto.page).toBe(2);
    expect(dto.pageSize).toBe(25);
  });

  it('rejects an unknown movement type and a malformed date', () => {
    expect(() =>
      parseListEdcMovementsDto({ movementType: 'TELEPORTED' }),
    ).toThrow(BadRequestException);
    expect(() => parseListEdcMovementsDto({ dateFrom: '01-08-2026' })).toThrow(
      BadRequestException,
    );
  });
});

describe('parseListPeripheralMovementsDto', () => {
  it('accepts a reason filter', () => {
    expect(
      parseListPeripheralMovementsDto({ reason: 'INBOUND_RECEIPT' }).reason,
    ).toBe('INBOUND_RECEIPT');
  });

  it('rejects an unknown reason', () => {
    expect(() =>
      parseListPeripheralMovementsDto({ reason: 'SHRINKAGE' }),
    ).toThrow(BadRequestException);
  });
});

describe('parseStockLevelFiltersDto', () => {
  it('accepts warehouse-type filters and empty queries', () => {
    expect(
      parseStockLevelFiltersDto({ warehouseType: 'CENTRAL' }).warehouseType,
    ).toBe('CENTRAL');
    expect(parseStockLevelFiltersDto(undefined)).toEqual({});
  });

  it('rejects an unknown warehouse type', () => {
    expect(() => parseStockLevelFiltersDto({ warehouseType: 'MEGA' })).toThrow(
      BadRequestException,
    );
  });
});
