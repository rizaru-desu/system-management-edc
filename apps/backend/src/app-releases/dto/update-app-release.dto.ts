import { BadRequestException } from '@nestjs/common';
import { z } from 'zod';
import { appReleaseBaseSchema } from './create-app-release.dto';

/**
 * PATCH payload: every field optional, omitted fields left untouched. The
 * base schema carries no defaults on purpose — a default would survive
 * `.partial()` and silently overwrite stored values on every PATCH.
 */
const updateAppReleaseSchema = appReleaseBaseSchema.partial();

export type UpdateAppReleaseDto = z.infer<typeof updateAppReleaseSchema>;

export function parseUpdateAppReleaseDto(body: unknown): UpdateAppReleaseDto {
  const result = updateAppReleaseSchema.safeParse(body);
  if (!result.success) {
    throw new BadRequestException(z.prettifyError(result.error));
  }
  return result.data;
}
