import { BadRequestException } from '@nestjs/common';
import { z } from 'zod';
import { PRODUCT_CATEGORIES, PRODUCT_STATUSES } from '@repo/db/schema';

/**
 * Query string of GET /products. Numbers arrive as strings in a query
 * string, so pagination fields are coerced; the db layer clamps pageSize
 * to its own maximum.
 */
const listProductsSchema = z.object({
  /** Case-insensitive substring match on model name or brand. */
  search: z.string().optional(),
  category: z.enum(PRODUCT_CATEGORIES).optional(),
  status: z.enum(PRODUCT_STATUSES).optional(),
  /** 1-based page number. */
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().optional(),
});

export type ListProductsDto = z.infer<typeof listProductsSchema>;

export function parseListProductsDto(query: unknown): ListProductsDto {
  const result = listProductsSchema.safeParse(query ?? {});
  if (!result.success) {
    throw new BadRequestException(z.prettifyError(result.error));
  }
  return result.data;
}
