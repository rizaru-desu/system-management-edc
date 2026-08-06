import { BadRequestException } from '@nestjs/common';
import { z } from 'zod';
import {
  MERCHANT_SORT_FIELDS,
  MERCHANT_STATUSES,
  SORT_ORDERS,
} from '@repo/db/schema';

/**
 * Query string of GET /merchants. Numbers arrive as strings in a query
 * string, so pagination fields are coerced; the db layer clamps pageSize to
 * its own maximum. Sort fields are whitelist-validated so raw input never
 * reaches an ORDER BY.
 */
const merchantFilterSchema = z.object({
  /** Case-insensitive substring match on code, name, PIC or phone. */
  search: z.string().optional(),
  status: z.enum(MERCHANT_STATUSES).optional(),
  /** Merchants belonging to this service point only. */
  servicePointId: z.string().optional(),
  sortBy: z.enum(MERCHANT_SORT_FIELDS).optional(),
  sortOrder: z.enum(SORT_ORDERS).optional(),
  /** 1-based page number. */
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().optional(),
});

export type MerchantFilterDto = z.infer<typeof merchantFilterSchema>;

export function parseMerchantFilterDto(query: unknown): MerchantFilterDto {
  const result = merchantFilterSchema.safeParse(query ?? {});
  if (!result.success) {
    throw new BadRequestException(z.prettifyError(result.error));
  }
  return result.data;
}
