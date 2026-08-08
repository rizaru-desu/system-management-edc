import { BadRequestException } from '@nestjs/common';
import { z } from 'zod';
import {
  contractLineBaseSchema,
  datesOrdered,
} from './create-contract-line.dto';

/**
 * PATCH body: any subset of the create fields. Omitted fields stay
 * untouched (deep validation — number uniqueness, account/project
 * existence — lives in the db layer's transactional update). The date-order
 * rule only sees the provided fields; a PATCH changing one date against a
 * stored other is accepted here and left to the caller's judgement, like
 * the other modules' partial updates.
 */
const updateContractLineSchema = contractLineBaseSchema
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: 'provide at least one field to update',
  })
  .refine(datesOrdered, {
    message: 'endDate must be on or after startDate',
    path: ['endDate'],
  });

export type UpdateContractLineDto = z.infer<typeof updateContractLineSchema>;

export function parseUpdateContractLineDto(
  body: unknown,
): UpdateContractLineDto {
  const result = updateContractLineSchema.safeParse(body);
  if (!result.success) {
    throw new BadRequestException(z.prettifyError(result.error));
  }
  return result.data;
}
