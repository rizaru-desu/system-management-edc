import { BadRequestException } from '@nestjs/common';
import { z } from 'zod';
import { WAREHOUSE_STATUSES, WAREHOUSE_TYPES } from '@repo/db/schema';

/**
 * Query string of GET /warehouses. Numbers arrive as strings in a query
 * string, so pagination fields are coerced; the db layer clamps pageSize
 * to its own maximum.
 */
const listWarehousesSchema = z.object({
  /** Case-insensitive substring match on name or code. */
  search: z.string().optional(),
  type: z.enum(WAREHOUSE_TYPES).optional(),
  /** Exact region match (region names come from the data itself). */
  region: z.string().optional(),
  status: z.enum(WAREHOUSE_STATUSES).optional(),
  /** 1-based page number. */
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().optional(),
});

export type ListWarehousesDto = z.infer<typeof listWarehousesSchema>;

export function parseListWarehousesDto(query: unknown): ListWarehousesDto {
  const result = listWarehousesSchema.safeParse(query ?? {});
  if (!result.success) {
    throw new BadRequestException(z.prettifyError(result.error));
  }
  return result.data;
}
