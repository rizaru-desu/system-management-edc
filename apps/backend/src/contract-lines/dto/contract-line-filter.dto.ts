import { BadRequestException } from '@nestjs/common';
import { z } from 'zod';
import {
  CONTRACT_LINE_SORT_FIELDS,
  CONTRACT_LINE_STATUSES,
  DOCUMENT_STATUSES,
  SORT_ORDERS,
} from '@repo/db/schema';

/**
 * Query string of GET /contract-lines. Numbers arrive as strings in a
 * query string, so pagination fields are coerced; the db layer clamps
 * pageSize to its own maximum. Sort fields are whitelist-validated so raw
 * input never reaches an ORDER BY.
 */
const contractLineFilterSchema = z.object({
  /** Case-insensitive substring match on line number or name. */
  search: z.string().optional(),
  status: z.enum(CONTRACT_LINE_STATUSES).optional(),
  documentStatus: z.enum(DOCUMENT_STATUSES).optional(),
  /** Lines belonging to this account only. */
  accountId: z.string().optional(),
  /** Lines belonging to this project only. */
  projectId: z.string().optional(),
  sortBy: z.enum(CONTRACT_LINE_SORT_FIELDS).optional(),
  sortOrder: z.enum(SORT_ORDERS).optional(),
  /** 1-based page number. */
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().optional(),
});

export type ContractLineFilterDto = z.infer<typeof contractLineFilterSchema>;

export function parseContractLineFilterDto(
  query: unknown,
): ContractLineFilterDto {
  const result = contractLineFilterSchema.safeParse(query ?? {});
  if (!result.success) {
    throw new BadRequestException(z.prettifyError(result.error));
  }
  return result.data;
}
