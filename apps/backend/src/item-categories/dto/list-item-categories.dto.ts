import { BadRequestException } from '@nestjs/common';
import { z } from 'zod';
import { ACCESSORY_CATEGORIES, ITEM_CATEGORY_STATUSES } from '@repo/db/schema';

/**
 * Query string of GET /item-categories. Numbers arrive as strings in a
 * query string, so pagination fields are coerced; the db layer clamps
 * pageSize to its own maximum.
 */
const listItemCategoriesSchema = z.object({
  /** Case-insensitive substring match on the item name. */
  search: z.string().optional(),
  accessoryCategory: z.enum(ACCESSORY_CATEGORIES).optional(),
  status: z.enum(ITEM_CATEGORY_STATUSES).optional(),
  /** 1-based page number. */
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().optional(),
});

export type ListItemCategoriesDto = z.infer<typeof listItemCategoriesSchema>;

export function parseListItemCategoriesDto(
  query: unknown,
): ListItemCategoriesDto {
  const result = listItemCategoriesSchema.safeParse(query ?? {});
  if (!result.success) {
    throw new BadRequestException(z.prettifyError(result.error));
  }
  return result.data;
}
