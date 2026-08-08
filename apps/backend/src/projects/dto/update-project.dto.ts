import { BadRequestException } from '@nestjs/common';
import { z } from 'zod';
import { projectBaseSchema } from './create-project.dto';

/**
 * PATCH body: any subset of the create fields. Omitted fields stay
 * untouched (deep validation — code uniqueness — lives in the db layer's
 * transactional update).
 */
const updateProjectSchema = projectBaseSchema
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: 'provide at least one field to update',
  });

export type UpdateProjectDto = z.infer<typeof updateProjectSchema>;

export function parseUpdateProjectDto(body: unknown): UpdateProjectDto {
  const result = updateProjectSchema.safeParse(body);
  if (!result.success) {
    throw new BadRequestException(z.prettifyError(result.error));
  }
  return result.data;
}
