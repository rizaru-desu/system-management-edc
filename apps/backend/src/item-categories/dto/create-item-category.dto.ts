import { BadRequestException } from '@nestjs/common';
import { z } from 'zod';
import {
  ACCESSORY_CATEGORIES,
  ITEM_CATEGORY_STATUSES,
  ITEM_CATEGORY_UNITS,
} from '@repo/db/schema';

const MAX_TEXT_LENGTH = 500;

/** Optional free-text field: trimmed, with '' / undefined stored as null. */
const optionalText = z
  .string()
  .trim()
  .max(MAX_TEXT_LENGTH)
  .nullish()
  .transform((value) => (value ? value : null));

/**
 * Shared field validators of the create/update forms. `status` carries no
 * default here on purpose: a default would survive `.partial()` and make
 * every PATCH silently force ACTIVE — the create schema adds it below.
 */
export const itemCategoryBaseSchema = z.object({
  name: z.string().trim().min(1, 'name is required').max(200),
  /** Optional human-entered identifier (e.g. ACC-001); '' stored as null. */
  code: z
    .string()
    .trim()
    .max(50)
    .nullish()
    .transform((value) => (value ? value : null)),
  accessoryCategory: z.enum(ACCESSORY_CATEGORIES),
  unit: z.enum(ITEM_CATEGORY_UNITS),
  description: optionalText,
  status: z.enum(ITEM_CATEGORY_STATUSES),
});

const createItemCategorySchema = itemCategoryBaseSchema.extend({
  status: z.enum(ITEM_CATEGORY_STATUSES).default('ACTIVE'),
});

export type CreateItemCategoryDto = z.infer<typeof createItemCategorySchema>;

export function parseCreateItemCategoryDto(
  body: unknown,
): CreateItemCategoryDto {
  const result = createItemCategorySchema.safeParse(body);
  if (!result.success) {
    throw new BadRequestException(z.prettifyError(result.error));
  }
  return result.data;
}
