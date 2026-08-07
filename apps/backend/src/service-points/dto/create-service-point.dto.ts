import { BadRequestException } from '@nestjs/common';
import { z } from 'zod';
import { SERVICE_POINT_STATUSES } from '@repo/db/schema';

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
export const servicePointBaseSchema = z.object({
  code: z.string().trim().min(1, 'code is required').max(50),
  name: z.string().trim().min(1, 'name is required').max(200),
  /** Live parent service point id; null/omitted = top level. */
  parentId: z
    .string()
    .min(1)
    .nullish()
    .transform((value) => value ?? null),
  region: optionalText,
  address: optionalText,
  phone: optionalText,
  email: z
    .email()
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
  /**
   * Service area radius (km) for the merchant import's automatic
   * assignment; null/omitted = unlimited (nearest service point always
   * wins). Decimals allowed.
   */
  coverageRadiusKm: z
    .number('coverageRadiusKm must be a valid number')
    .positive('coverageRadiusKm must be greater than 0')
    .max(1000, 'coverageRadiusKm cannot exceed 1000 KM')
    .nullish()
    .transform((value) => value ?? null),
  notes: optionalText,
  status: z.enum(SERVICE_POINT_STATUSES),
});

const createServicePointSchema = servicePointBaseSchema.extend({
  status: z.enum(SERVICE_POINT_STATUSES).default('ACTIVE'),
});

export type CreateServicePointDto = z.infer<typeof createServicePointSchema>;

export function parseCreateServicePointDto(
  body: unknown,
): CreateServicePointDto {
  const result = createServicePointSchema.safeParse(body);
  if (!result.success) {
    throw new BadRequestException(z.prettifyError(result.error));
  }
  return result.data;
}
