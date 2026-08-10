import { BadRequestException } from '@nestjs/common';
import { z } from 'zod';
import { itemCategoryBaseSchema } from './create-item-category.dto';

/**
 * PATCH body: any subset of the create fields. Omitted fields stay
 * untouched; sending `code: null` (or '') clears the item code (name/code
 * uniqueness re-validation lives in the db layer's transactional update).
 */
const updateItemCategorySchema = itemCategoryBaseSchema
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: 'provide at least one field to update',
  });

export type UpdateItemCategoryDto = z.infer<typeof updateItemCategorySchema>;

export function parseUpdateItemCategoryDto(
  body: unknown,
): UpdateItemCategoryDto {
  const result = updateItemCategorySchema.safeParse(body);
  if (!result.success) {
    throw new BadRequestException(z.prettifyError(result.error));
  }
  return result.data;
}
