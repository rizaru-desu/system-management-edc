import { BadRequestException } from '@nestjs/common';
import { parseCreateInboundShipmentDto } from './create-inbound-shipment.dto';
import {
  parseAddEdcItemDto,
  parseUpdateEdcItemDto,
  parseUpdatePeripheralItemDto,
} from './inspection.dto';

const validBody = {
  doNumber: '  DO/ABC/2026/VIII/0417  ',
  partnerAccountId: 'acc-1',
  destinationWarehouseId: 'wh-1',
  receivedDate: '2026-08-10',
  edcItems: [{ serialNumber: '  PAX-001  ', productId: 'prd-1' }],
  peripheralItems: [{ itemCategoryId: 'itm-1', documentedQty: 10 }],
};

describe('parseCreateInboundShipmentDto', () => {
  it('trims text and defaults the optional header fields', () => {
    const dto = parseCreateInboundShipmentDto(validBody);

    expect(dto.doNumber).toBe('DO/ABC/2026/VIII/0417');
    expect(dto.edcItems[0]?.serialNumber).toBe('PAX-001');
    expect(dto.shipmentDate).toBeNull();
    expect(dto.notes).toBeNull();
    // A recording always starts pre-inspection.
    expect(dto.status).toBe('DRAFT');
  });

  it('accepts a submitted-for-inspection status', () => {
    const dto = parseCreateInboundShipmentDto({
      ...validBody,
      status: 'PENDING_INSPECTION',
    });

    expect(dto.status).toBe('PENDING_INSPECTION');
  });

  it('rejects a status that would skip the finalize transaction', () => {
    expect(() =>
      parseCreateInboundShipmentDto({ ...validBody, status: 'COMPLETED' }),
    ).toThrow(BadRequestException);
  });

  it('rejects a shipment with neither units nor peripherals', () => {
    expect(() =>
      parseCreateInboundShipmentDto({
        ...validBody,
        edcItems: [],
        peripheralItems: [],
      }),
    ).toThrow(BadRequestException);
  });

  it('rejects a missing DO number and a non-positive quantity', () => {
    expect(() =>
      parseCreateInboundShipmentDto({ ...validBody, doNumber: '   ' }),
    ).toThrow(BadRequestException);
    expect(() =>
      parseCreateInboundShipmentDto({
        ...validBody,
        peripheralItems: [{ itemCategoryId: 'itm-1', documentedQty: 0 }],
      }),
    ).toThrow(BadRequestException);
  });

  it('rejects a malformed received date', () => {
    expect(() =>
      parseCreateInboundShipmentDto({
        ...validBody,
        receivedDate: '10-08-2026',
      }),
    ).toThrow(BadRequestException);
  });
});

describe('parseUpdateEdcItemDto', () => {
  it('accepts a partial inspection result', () => {
    const dto = parseUpdateEdcItemDto({
      foundStatus: 'FOUND',
      condition: 'DAMAGED',
      accessories: [{ itemCategoryId: 'itm-1', isPresent: true }],
    });

    expect(dto.foundStatus).toBe('FOUND');
    expect(dto.condition).toBe('DAMAGED');
    expect(dto.accessories).toHaveLength(1);
  });

  it('drops a completeness verdict sent by the client', () => {
    const dto = parseUpdateEdcItemDto({
      foundStatus: 'FOUND',
      completenessStatus: 'COMPLETE',
    });

    // Derived from the checklist in the db layer, never taken from input.
    expect(dto).not.toHaveProperty('completenessStatus');
  });

  it('rejects an empty body and an unknown found status', () => {
    expect(() => parseUpdateEdcItemDto({})).toThrow(BadRequestException);
    expect(() => parseUpdateEdcItemDto({ foundStatus: 'LOST' })).toThrow(
      BadRequestException,
    );
  });
});

describe('parseAddEdcItemDto', () => {
  it('trims the serial of an unlisted find', () => {
    const dto = parseAddEdcItemDto({
      serialNumber: ' PAX-999 ',
      productId: 'prd-1',
    });

    expect(dto.serialNumber).toBe('PAX-999');
  });

  it('rejects a find without a product', () => {
    expect(() => parseAddEdcItemDto({ serialNumber: 'PAX-999' })).toThrow(
      BadRequestException,
    );
  });
});

describe('parseUpdatePeripheralItemDto', () => {
  it('coerces the counted quantity and allows clearing it', () => {
    expect(parseUpdatePeripheralItemDto({ receivedQty: '28' })).toEqual({
      receivedQty: 28,
    });
    expect(parseUpdatePeripheralItemDto({ receivedQty: null })).toEqual({
      receivedQty: null,
    });
  });

  it('rejects a negative count', () => {
    expect(() => parseUpdatePeripheralItemDto({ receivedQty: -1 })).toThrow(
      BadRequestException,
    );
  });
});
