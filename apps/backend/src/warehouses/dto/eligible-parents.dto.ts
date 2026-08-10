import { BadRequestException } from '@nestjs/common';
import { z } from 'zod';
import { WAREHOUSE_TYPES } from '@repo/db/schema';

/**
 * Query string of GET /warehouses/eligible-parents: the type the new/edited
 * warehouse will have (the response lists the one valid parent level for
 * it), plus the record being edited so it can never offer itself.
 */
const eligibleParentsSchema = z.object({
  type: z.enum(WAREHOUSE_TYPES),
  excludeId: z.string().min(1).optional(),
});

export type EligibleParentsDto = z.infer<typeof eligibleParentsSchema>;

export function parseEligibleParentsDto(query: unknown): EligibleParentsDto {
  const result = eligibleParentsSchema.safeParse(query ?? {});
  if (!result.success) {
    throw new BadRequestException(z.prettifyError(result.error));
  }
  return result.data;
}
