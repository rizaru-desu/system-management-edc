import { BadRequestException } from '@nestjs/common';
import { z } from 'zod';
import {
  FIELD_ENGINEER_SPECIALIZATIONS,
  FIELD_ENGINEER_STATUSES,
} from '@repo/db/schema';

/**
 * Body of POST /field-engineers and PATCH /field-engineers/:userId.
 *
 * Deliberately carries NO identity fields (name/phone/email) — those
 * belong to the User record managed in Users & Roles. The role
 * requirement on `userId` (create only) and warehouse liveness are
 * validated in the db layer's transactional writes.
 */
const profileFieldsSchema = z.object({
  warehouseId: z.string().trim().min(1, 'warehouseId is required'),
  coverageRegion: z
    .string()
    .trim()
    .min(1, 'coverageRegion is required')
    .max(200),
  specializations: z
    .array(z.enum(FIELD_ENGINEER_SPECIALIZATIONS))
    .min(1, 'pick at least one specialization')
    .refine(
      (keys) => new Set(keys).size === keys.length,
      'specializations must not repeat',
    ),
  status: z.enum(FIELD_ENGINEER_STATUSES).default('ACTIVE'),
});

const createProfileSchema = profileFieldsSchema.extend({
  userId: z.string().trim().min(1, 'userId is required'),
});

export type CreateFieldEngineerProfileDto = z.infer<
  typeof createProfileSchema
>;
export type UpdateFieldEngineerProfileDto = z.infer<
  typeof profileFieldsSchema
>;

export function parseCreateFieldEngineerProfileDto(
  body: unknown,
): CreateFieldEngineerProfileDto {
  const result = createProfileSchema.safeParse(body);
  if (!result.success) {
    throw new BadRequestException(z.prettifyError(result.error));
  }
  return result.data;
}

export function parseUpdateFieldEngineerProfileDto(
  body: unknown,
): UpdateFieldEngineerProfileDto {
  const result = profileFieldsSchema.safeParse(body);
  if (!result.success) {
    throw new BadRequestException(z.prettifyError(result.error));
  }
  return result.data;
}

/** Body of PATCH /field-engineers/:userId/status. */
const statusSchema = z.object({
  status: z.enum(FIELD_ENGINEER_STATUSES),
});

export type FieldEngineerStatusDto = z.infer<typeof statusSchema>;

export function parseFieldEngineerStatusDto(
  body: unknown,
): FieldEngineerStatusDto {
  const result = statusSchema.safeParse(body);
  if (!result.success) {
    throw new BadRequestException(z.prettifyError(result.error));
  }
  return result.data;
}
