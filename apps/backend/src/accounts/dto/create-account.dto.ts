import { BadRequestException } from '@nestjs/common';
import { z } from 'zod';
import { ACCOUNT_STATUSES, ACCOUNT_TYPES } from '@repo/db/schema';

const MAX_TEXT_LENGTH = 500;

/** Optional free-text field: trimmed, with '' / undefined stored as null. */
const optionalText = z
  .string()
  .trim()
  .max(MAX_TEXT_LENGTH)
  .nullish()
  .transform((value) => (value ? value : null));

/**
 * Digits with optional +, spaces, dashes or parentheses. Length is enforced
 * on the digits alone so formatting characters never change validity.
 */
const PHONE_PATTERN = /^\+?[\d\s()-]*\d[\d\s()-]*$/;

function isValidPhoneNumber(value: string): boolean {
  const digits = value.replace(/\D/g, '').length;
  return PHONE_PATTERN.test(value) && digits >= 7 && digits <= 20;
}

const picPhoneSchema = z
  .string()
  .trim()
  .refine(isValidPhoneNumber, {
    message: 'picPhone has an invalid format',
  })
  .nullish()
  .or(z.literal(''))
  .transform((value) => (value ? value : null));

/**
 * Shared field validators of the create/update forms. `status` carries no
 * default here on purpose: a default would survive `.partial()` and make
 * every PATCH silently force ACTIVE — the create schema adds it below.
 */
export const accountBaseSchema = z.object({
  accountId: z.string().trim().min(1, 'accountId is required').max(50),
  accountName: z.string().trim().min(1, 'accountName is required').max(200),
  accountType: z.enum(ACCOUNT_TYPES),
  status: z.enum(ACCOUNT_STATUSES),
  billingName: optionalText,
  taxId: optionalText,
  billingAddress: optionalText,
  city: optionalText,
  region: optionalText,
  picName: optionalText,
  picPhone: picPhoneSchema,
  picEmail: z
    .email()
    .nullish()
    .or(z.literal(''))
    .transform((value) => (value ? value : null)),
});

const createAccountSchema = accountBaseSchema.extend({
  status: z.enum(ACCOUNT_STATUSES).default('ACTIVE'),
});

export type CreateAccountDto = z.infer<typeof createAccountSchema>;

export function parseCreateAccountDto(body: unknown): CreateAccountDto {
  const result = createAccountSchema.safeParse(body);
  if (!result.success) {
    throw new BadRequestException(z.prettifyError(result.error));
  }
  return result.data;
}
