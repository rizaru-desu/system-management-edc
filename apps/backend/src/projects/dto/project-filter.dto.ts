import { BadRequestException } from '@nestjs/common';
import { z } from 'zod';
import {
  PROJECT_SORT_FIELDS,
  PROJECT_STATUSES,
  SORT_ORDERS,
} from '@repo/db/schema';

/**
 * Query string of GET /projects. Numbers arrive as strings in a query
 * string, so pagination fields are coerced; the db layer clamps pageSize to
 * its own maximum. Sort fields are whitelist-validated so raw input never
 * reaches an ORDER BY.
 */
const projectFilterSchema = z.object({
  /** Case-insensitive substring match on project code or name. */
  search: z.string().optional(),
  status: z.enum(PROJECT_STATUSES).optional(),
  sortBy: z.enum(PROJECT_SORT_FIELDS).optional(),
  sortOrder: z.enum(SORT_ORDERS).optional(),
  /** 1-based page number. */
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().optional(),
});

export type ProjectFilterDto = z.infer<typeof projectFilterSchema>;

export function parseProjectFilterDto(query: unknown): ProjectFilterDto {
  const result = projectFilterSchema.safeParse(query ?? {});
  if (!result.success) {
    throw new BadRequestException(z.prettifyError(result.error));
  }
  return result.data;
}
