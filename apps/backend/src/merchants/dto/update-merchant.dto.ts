import { BadRequestException } from '@nestjs/common';
import { z } from 'zod';
import { merchantBaseSchema } from './create-merchant.dto';

/**
 * PATCH body: any subset of the create fields. Omitted fields stay
 * untouched (deep validation — code uniqueness, service point existence —
 * lives in the db layer's transactional update).
 */
const updateMerchantSchema = merchantBaseSchema
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: 'provide at least one field to update',
  });

export type UpdateMerchantDto = z.infer<typeof updateMerchantSchema>;

export function parseUpdateMerchantDto(body: unknown): UpdateMerchantDto {
  const result = updateMerchantSchema.safeParse(body);
  if (!result.success) {
    throw new BadRequestException(z.prettifyError(result.error));
  }
  return result.data;
}
