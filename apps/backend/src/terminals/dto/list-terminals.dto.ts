import { BadRequestException } from '@nestjs/common';
import { z } from 'zod';
import { TERMINAL_STATUSES } from '@repo/db/schema';

/**
 * Query string of GET /terminals. Numbers arrive as strings in a query
 * string, so pagination fields are coerced; the db layer clamps pageSize
 * to its own maximum.
 */
const listTerminalsSchema = z.object({
  /** Case-insensitive substring match on the serial number. */
  search: z.string().optional(),
  status: z.enum(TERMINAL_STATUSES).optional(),
  warehouseId: z.string().min(1).optional(),
  productId: z.string().min(1).optional(),
  /** 1-based page number. */
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().optional(),
});

export type ListTerminalsDto = z.infer<typeof listTerminalsSchema>;

export function parseListTerminalsDto(query: unknown): ListTerminalsDto {
  const result = listTerminalsSchema.safeParse(query ?? {});
  if (!result.success) {
    throw new BadRequestException(z.prettifyError(result.error));
  }
  return result.data;
}
