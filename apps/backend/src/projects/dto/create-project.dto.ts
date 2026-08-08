import { BadRequestException } from '@nestjs/common';
import { z } from 'zod';
import { PROJECT_STATUSES } from '@repo/db/schema';

const MAX_TEXT_LENGTH = 500;

/**
 * Shared field validators of the create/update forms. `status` carries no
 * default here on purpose: a default would survive `.partial()` and make
 * every PATCH silently force ACTIVE — the create schema adds it below.
 */
export const projectBaseSchema = z.object({
  projectCode: z.string().trim().min(1, 'projectCode is required').max(50),
  projectName: z.string().trim().min(1, 'projectName is required').max(200),
  description: z
    .string()
    .trim()
    .max(MAX_TEXT_LENGTH)
    .nullish()
    .transform((value) => (value ? value : null)),
  status: z.enum(PROJECT_STATUSES),
});

const createProjectSchema = projectBaseSchema.extend({
  status: z.enum(PROJECT_STATUSES).default('ACTIVE'),
});

export type CreateProjectDto = z.infer<typeof createProjectSchema>;

export function parseCreateProjectDto(body: unknown): CreateProjectDto {
  const result = createProjectSchema.safeParse(body);
  if (!result.success) {
    throw new BadRequestException(z.prettifyError(result.error));
  }
  return result.data;
}
