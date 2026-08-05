import { BadRequestException } from '@nestjs/common';
import { z } from 'zod';

/**
 * Body of QUERY /users. Mirrors the old query-string filters one-to-one for
 * now; new filter shapes (arrays, ranges, nested groups) belong here rather
 * than in the URL.
 */
const listUsersSchema = z.object({
  /** Case-insensitive substring match on name or email. */
  search: z.string().optional(),
  /** Exact role key as stored in `user.role`. */
  role: z.string().optional(),
  /** 1-based page number. */
  page: z.number().int().positive().optional(),
  /** Rows per page; the db layer clamps it to its own maximum. */
  pageSize: z.number().int().positive().optional(),
});

export type ListUsersDto = z.infer<typeof listUsersSchema>;

export function parseListUsersDto(body: unknown): ListUsersDto {
  // A missing body means "first page, no filters" — QUERY bodies are optional.
  const result = listUsersSchema.safeParse(body ?? {});
  if (!result.success) {
    throw new BadRequestException(z.prettifyError(result.error));
  }
  return result.data;
}
