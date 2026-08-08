import { BadRequestException } from '@nestjs/common';
import { z } from 'zod';
import { accountBaseSchema } from './create-account.dto';

/**
 * PATCH body: any subset of the create fields. Omitted fields stay
 * untouched (deep validation — business-id uniqueness — lives in the db
 * layer's transactional update).
 */
const updateAccountSchema = accountBaseSchema
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: 'provide at least one field to update',
  });

export type UpdateAccountDto = z.infer<typeof updateAccountSchema>;

export function parseUpdateAccountDto(body: unknown): UpdateAccountDto {
  const result = updateAccountSchema.safeParse(body);
  if (!result.success) {
    throw new BadRequestException(z.prettifyError(result.error));
  }
  return result.data;
}
