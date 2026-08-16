import { BadRequestException } from '@nestjs/common';
import { z } from 'zod';

const MAX_TEXT_LENGTH = 500;

/** Optional free-text field: trimmed, with '' / undefined stored as null. */
const optionalText = z
  .string()
  .trim()
  .max(MAX_TEXT_LENGTH)
  .nullish()
  .transform((value) => (value ? value : null));

/** One serialized unit on the manifest (inspection fields come later). */
const edcItemSchema = z.object({
  serialNumber: z.string().trim().min(1, 'serialNumber is required').max(100),
  productId: z.string().min(1, 'productId is required'),
});

/** One non-serialized line: the quantity the paperwork claims. */
const peripheralItemSchema = z.object({
  itemCategoryId: z.string().min(1, 'itemCategoryId is required'),
  documentedQty: z.coerce
    .number()
    .int('documentedQty must be a whole number')
    .positive('documentedQty must be at least 1'),
});

/**
 * Shared field validators of the shipment recording form. Referential
 * rules (partner/warehouse/product/item existence, DO uniqueness, manifest
 * duplicates) live in the db layer's transactional writes, so they can be
 * checked against live rows inside the same transaction as the insert.
 */
export const inboundShipmentBaseSchema = z.object({
  doNumber: z.string().trim().min(1, 'doNumber is required').max(100),
  partnerAccountId: z.string().min(1, 'partnerAccountId is required'),
  destinationWarehouseId: z
    .string()
    .min(1, 'destinationWarehouseId is required'),
  /** null when the partner did not document a dispatch date. */
  shipmentDate: z.iso
    .date('shipmentDate must be a yyyy-mm-dd date')
    .nullish()
    .transform((value) => value ?? null),
  receivedDate: z.iso.date('receivedDate must be a yyyy-mm-dd date'),
  notes: optionalText,
  /**
   * Only the two pre-inspection states are settable here: the inspection
   * endpoints own every later transition, so a client can never jump a
   * shipment straight to COMPLETED and skip the finalize transaction.
   */
  status: z.enum(['DRAFT', 'PENDING_INSPECTION']).default('DRAFT'),
  /**
   * The earlier DO whose shortage this shipment fulfils; the db layer
   * verifies it exists and (on update) is not the shipment itself.
   */
  parentShipmentId: z
    .string()
    .nullish()
    .transform((value) => (value ? value : null)),
  edcItems: z.array(edcItemSchema).default([]),
  peripheralItems: z.array(peripheralItemSchema).default([]),
});

const createInboundShipmentSchema = inboundShipmentBaseSchema.refine(
  (value) => value.edcItems.length > 0 || value.peripheralItems.length > 0,
  { message: 'A shipment needs at least one EDC unit or peripheral line' },
);

export type CreateInboundShipmentDto = z.infer<
  typeof createInboundShipmentSchema
>;

export function parseCreateInboundShipmentDto(
  body: unknown,
): CreateInboundShipmentDto {
  const result = createInboundShipmentSchema.safeParse(body);
  if (!result.success) {
    throw new BadRequestException(z.prettifyError(result.error));
  }
  return result.data;
}
