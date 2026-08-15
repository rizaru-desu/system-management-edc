import { BadRequestException } from '@nestjs/common';
import { z } from 'zod';
import { paymentMethodBaseSchema } from './create-payment-method.dto';

/** Body of PATCH /payment-methods/:id — any subset of the form fields. */
const updatePaymentMethodSchema = paymentMethodBaseSchema
  .partial()
  .refine((value) => Object.keys(value).length > 0, {
    message: 'Provide at least one field to update',
  });

export type UpdatePaymentMethodDto = z.infer<typeof updatePaymentMethodSchema>;

export function parseUpdatePaymentMethodDto(
  body: unknown,
): UpdatePaymentMethodDto {
  const result = updatePaymentMethodSchema.safeParse(body);
  if (!result.success) {
    throw new BadRequestException(z.prettifyError(result.error));
  }
  return result.data;
}
