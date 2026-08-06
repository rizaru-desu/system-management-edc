import { BadRequestException } from '@nestjs/common';
import { z } from 'zod';

/** PATCH /app-releases/:id/publish — true publishes, false unpublishes. */
const publishAppReleaseSchema = z.object({
  isActive: z.boolean(),
});

export type PublishAppReleaseDto = z.infer<typeof publishAppReleaseSchema>;

export function parsePublishAppReleaseDto(body: unknown): PublishAppReleaseDto {
  const result = publishAppReleaseSchema.safeParse(body);
  if (!result.success) {
    throw new BadRequestException(z.prettifyError(result.error));
  }
  return result.data;
}
