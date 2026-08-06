import { BadRequestException } from '@nestjs/common';
import { z } from 'zod';
import { servicePointBaseSchema } from './create-service-point.dto';

/**
 * PATCH body: any subset of the create fields. Omitted fields stay
 * untouched; sending `parentId: null` moves the service point to the top
 * level (deep validation — parent existence, self-reference, cycles — lives
 * in the db layer's transactional update).
 */
const updateServicePointSchema = servicePointBaseSchema
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: 'provide at least one field to update',
  });

export type UpdateServicePointDto = z.infer<typeof updateServicePointSchema>;

export function parseUpdateServicePointDto(
  body: unknown,
): UpdateServicePointDto {
  const result = updateServicePointSchema.safeParse(body);
  if (!result.success) {
    throw new BadRequestException(z.prettifyError(result.error));
  }
  return result.data;
}
