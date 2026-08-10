import { BadRequestException } from '@nestjs/common';
import { z } from 'zod';
import { warehouseBaseSchema } from './create-warehouse.dto';

/**
 * PATCH body: any subset of the create fields. Omitted fields stay
 * untouched. The hierarchy invariants (parent ladder, cycle prevention,
 * type locked while children exist) are re-validated in the db layer's
 * transactional update against the effective post-update record.
 */
const updateWarehouseSchema = warehouseBaseSchema
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: 'provide at least one field to update',
  });

export type UpdateWarehouseDto = z.infer<typeof updateWarehouseSchema>;

export function parseUpdateWarehouseDto(body: unknown): UpdateWarehouseDto {
  const result = updateWarehouseSchema.safeParse(body);
  if (!result.success) {
    throw new BadRequestException(z.prettifyError(result.error));
  }
  return result.data;
}
