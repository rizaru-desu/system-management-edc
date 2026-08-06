import { BadRequestException } from '@nestjs/common';
import { z } from 'zod';
import { MERCHANT_STATUSES } from '@repo/db/schema';

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

/** Format check shared with the Excel import's per-row validation. */
export function isValidPhoneNumber(value: string): boolean {
  const digits = value.replace(/\D/g, '').length;
  return PHONE_PATTERN.test(value) && digits >= 7 && digits <= 20;
}

/** Format check shared with the Excel import's per-row validation. */
export function isValidEmail(value: string): boolean {
  return z.email().safeParse(value).success;
}

const phoneNumberSchema = z
  .string()
  .trim()
  .refine(isValidPhoneNumber, {
    message: 'phoneNumber has an invalid format',
  })
  .nullish()
  .or(z.literal(''))
  .transform((value) => (value ? value : null));

/**
 * Shared field validators of the create/update forms. `status` carries no
 * default here on purpose: a default would survive `.partial()` and make
 * every PATCH silently force ACTIVE — the create schema adds it below.
 */
export const merchantBaseSchema = z.object({
  merchantCode: z.string().trim().min(1, 'merchantCode is required').max(50),
  merchantName: z.string().trim().min(1, 'merchantName is required').max(200),
  merchantType: optionalText,
  picName: optionalText,
  phoneNumber: phoneNumberSchema,
  email: z
    .email()
    .nullish()
    .or(z.literal(''))
    .transform((value) => (value ? value : null)),
  address: optionalText,
  province: optionalText,
  city: optionalText,
  district: optionalText,
  postalCode: z
    .string()
    .trim()
    .regex(/^\d{5}$/, 'postalCode must be 5 digits')
    .nullish()
    .or(z.literal(''))
    .transform((value) => (value ? value : null)),
  latitude: z
    .number()
    .min(-90)
    .max(90)
    .nullish()
    .transform((value) => value ?? null),
  longitude: z
    .number()
    .min(-180)
    .max(180)
    .nullish()
    .transform((value) => value ?? null),
  /** Live service point the merchant belongs to. */
  servicePointId: z.string().trim().min(1, 'servicePointId is required'),
  status: z.enum(MERCHANT_STATUSES),
});

const createMerchantSchema = merchantBaseSchema.extend({
  status: z.enum(MERCHANT_STATUSES).default('ACTIVE'),
});

export type CreateMerchantDto = z.infer<typeof createMerchantSchema>;

export function parseCreateMerchantDto(body: unknown): CreateMerchantDto {
  const result = createMerchantSchema.safeParse(body);
  if (!result.success) {
    throw new BadRequestException(z.prettifyError(result.error));
  }
  return result.data;
}
