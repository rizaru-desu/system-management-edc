import { BadRequestException } from '@nestjs/common';
import { z } from 'zod';
import { productBaseSchema } from './create-product.dto';

/**
 * PATCH body: any subset of the create fields. Omitted fields stay
 * untouched; sending `completenessItems` replaces the whole list inside
 * the db layer's transactional update.
 */
const updateProductSchema = productBaseSchema
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: 'provide at least one field to update',
  });

export type UpdateProductDto = z.infer<typeof updateProductSchema>;

export function parseUpdateProductDto(body: unknown): UpdateProductDto {
  const result = updateProductSchema.safeParse(body);
  if (!result.success) {
    throw new BadRequestException(z.prettifyError(result.error));
  }
  return result.data;
}
