import { BadRequestException } from '@nestjs/common';
import { z } from 'zod';

/**
 * Query string of GET /field-engineers. Numbers arrive as strings in a
 * query string, so pagination fields are coerced; the db layer clamps
 * pageSize to its own maximum.
 */
const listFieldEngineersSchema = z.object({
  /** Case-insensitive substring match on the user's name or email. */
  search: z.string().optional(),
  warehouseId: z.string().optional(),
  /** Onboarded ("complete") vs still without a profile ("needs-setup"). */
  profileStatus: z.enum(['complete', 'needs-setup']).optional(),
  /** 1-based page number. */
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().optional(),
});

export type ListFieldEngineersDto = z.infer<typeof listFieldEngineersSchema>;

export function parseListFieldEngineersDto(
  query: unknown,
): ListFieldEngineersDto {
  const result = listFieldEngineersSchema.safeParse(query ?? {});
  if (!result.success) {
    throw new BadRequestException(z.prettifyError(result.error));
  }
  return result.data;
}
