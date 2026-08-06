import { BadRequestException } from '@nestjs/common';
import { z } from 'zod';
import { SERVICE_POINT_STATUSES } from '@repo/db/schema';

/**
 * Query string of GET /service-points. Numbers arrive as strings in a query
 * string, so pagination fields are coerced; the db layer clamps pageSize to
 * its own maximum.
 */
const listServicePointsSchema = z.object({
  /** Case-insensitive substring match on code, name or region. */
  search: z.string().optional(),
  status: z.enum(SERVICE_POINT_STATUSES).optional(),
  /**
   * Direct children of this id only; the literal string "null" filters
   * top-level service points (a query string cannot carry a real null).
   */
  parentId: z
    .string()
    .optional()
    .transform((value) => (value === 'null' ? null : value)),
  /** 1-based page number. */
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().optional(),
});

export type ListServicePointsDto = z.infer<typeof listServicePointsSchema>;

export function parseListServicePointsDto(
  query: unknown,
): ListServicePointsDto {
  const result = listServicePointsSchema.safeParse(query ?? {});
  if (!result.success) {
    throw new BadRequestException(z.prettifyError(result.error));
  }
  return result.data;
}
