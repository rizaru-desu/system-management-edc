import { BadRequestException } from '@nestjs/common';
import { z } from 'zod';
import { PAYMENT_METHOD_STATUSES } from '@repo/db/schema';

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
 * Name/code uniqueness lives in the db layer's transactional writes.
 */
export const paymentMethodBaseSchema = z.object({
  name: z.string().trim().min(1, 'name is required').max(200),
  code: z
    .string()
    .trim()
    .max(50)
    .nullish()
    .transform((value) => (value ? value : null)),
  description: optionalText,
  status: z.enum(PAYMENT_METHOD_STATUSES),
});

const createPaymentMethodSchema = paymentMethodBaseSchema.extend({
  status: z.enum(PAYMENT_METHOD_STATUSES).default('ACTIVE'),
});

export type CreatePaymentMethodDto = z.infer<typeof createPaymentMethodSchema>;

export function parseCreatePaymentMethodDto(
  body: unknown,
): CreatePaymentMethodDto {
  const result = createPaymentMethodSchema.safeParse(body);
  if (!result.success) {
    throw new BadRequestException(z.prettifyError(result.error));
  }
  return result.data;
}
