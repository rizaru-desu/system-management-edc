import { BadRequestException } from '@nestjs/common';
import { z } from 'zod';
import { INBOUND_SHIPMENT_STATUSES } from '@repo/db/schema';

/**
 * Query string of GET /inbound-shipments. Numbers arrive as strings in a
 * query string, so pagination fields are coerced; the db layer clamps
 * pageSize to its own maximum.
 */
const listInboundShipmentsSchema = z.object({
  /** Case-insensitive substring match on DO number or partner name. */
  search: z.string().optional(),
  status: z.enum(INBOUND_SHIPMENT_STATUSES).optional(),
  warehouseId: z.string().min(1).optional(),
  partnerAccountId: z.string().min(1).optional(),
  /** 1-based page number. */
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().optional(),
});

export type ListInboundShipmentsDto = z.infer<
  typeof listInboundShipmentsSchema
>;

export function parseListInboundShipmentsDto(
  query: unknown,
): ListInboundShipmentsDto {
  const result = listInboundShipmentsSchema.safeParse(query ?? {});
  if (!result.success) {
    throw new BadRequestException(z.prettifyError(result.error));
  }
  return result.data;
}
