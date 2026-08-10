import { BadRequestException } from '@nestjs/common';
import { z } from 'zod';
import { WAREHOUSE_STATUSES, WAREHOUSE_TYPES } from '@repo/db/schema';

const MAX_TEXT_LENGTH = 500;

/**
 * Shared field validators of the create/update forms. `status` carries no
 * default here on purpose: a default would survive `.partial()` and make
 * every PATCH silently force ACTIVE — the create schema adds it below.
 * The type ↔ parent ladder (CENTRAL has no parent, REGIONAL under a
 * CENTRAL, SERVICE_POINT under a REGIONAL, no cycles) is enforced in the
 * db layer's transactional writes, where the referenced rows can be read
 * consistently.
 */
export const warehouseBaseSchema = z.object({
  name: z.string().trim().min(1, 'name is required').max(200),
  code: z.string().trim().min(1, 'code is required').max(50),
  type: z.enum(WAREHOUSE_TYPES),
  /** Parent warehouse id; null/omitted = top level (CENTRAL only). */
  parentId: z
    .string()
    .min(1)
    .nullish()
    .transform((value) => value ?? null),
  region: z.string().trim().min(1, 'region is required').max(200),
  address: z.string().trim().min(1, 'address is required').max(MAX_TEXT_LENGTH),
  picName: z.string().trim().min(1, 'picName is required').max(200),
  picContact: z
    .string()
    .trim()
    .max(200)
    .nullish()
    .transform((value) => (value ? value : null)),
  /** Storage capacity in terminal units; null/omitted = not set. */
  capacity: z
    .number('capacity must be a valid number')
    .int('capacity must be a whole number')
    .positive('capacity must be greater than 0')
    .nullish()
    .transform((value) => value ?? null),
  status: z.enum(WAREHOUSE_STATUSES),
});

const createWarehouseSchema = warehouseBaseSchema.extend({
  status: z.enum(WAREHOUSE_STATUSES).default('ACTIVE'),
});

export type CreateWarehouseDto = z.infer<typeof createWarehouseSchema>;

export function parseCreateWarehouseDto(body: unknown): CreateWarehouseDto {
  const result = createWarehouseSchema.safeParse(body);
  if (!result.success) {
    throw new BadRequestException(z.prettifyError(result.error));
  }
  return result.data;
}
