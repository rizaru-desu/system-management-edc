import { BadRequestException } from '@nestjs/common';
import { z } from 'zod';
import {
  ACCOUNT_SORT_FIELDS,
  ACCOUNT_STATUSES,
  ACCOUNT_TYPES,
  SORT_ORDERS,
} from '@repo/db/schema';

/**
 * Query string of GET /accounts. Numbers arrive as strings in a query
 * string, so pagination fields are coerced; the db layer clamps pageSize to
 * its own maximum. Sort fields are whitelist-validated so raw input never
 * reaches an ORDER BY.
 */
const accountFilterSchema = z.object({
  /** Case-insensitive substring match on account id, name or PIC name. */
  search: z.string().optional(),
  accountType: z.enum(ACCOUNT_TYPES).optional(),
  status: z.enum(ACCOUNT_STATUSES).optional(),
  sortBy: z.enum(ACCOUNT_SORT_FIELDS).optional(),
  sortOrder: z.enum(SORT_ORDERS).optional(),
  /** 1-based page number. */
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().optional(),
});

export type AccountFilterDto = z.infer<typeof accountFilterSchema>;

export function parseAccountFilterDto(query: unknown): AccountFilterDto {
  const result = accountFilterSchema.safeParse(query ?? {});
  if (!result.success) {
    throw new BadRequestException(z.prettifyError(result.error));
  }
  return result.data;
}
