import { BadRequestException } from '@nestjs/common';
import { z } from 'zod';
import type { MobileVersionIdentity } from '@repo/db';
import {
  APP_RELEASE_PLATFORMS,
  APP_RELEASE_UPDATE_TYPES,
} from './create-app-release.dto';

/**
 * Query-string of GET /app-releases/check-availability — the identity
 * combination to probe, with `excludeId` skipping the record being edited.
 * Deliberately lenient on the version format: the check is advisory (the
 * strict create/update DTOs still gate the actual write).
 */
const checkAvailabilitySchema = z.object({
  platform: z.enum(APP_RELEASE_PLATFORMS),
  updateType: z.enum(APP_RELEASE_UPDATE_TYPES),
  latestVersion: z.string().trim().min(1).max(50),
  versionCode: z.coerce.number().int().min(0).default(0),
  excludeId: z
    .string()
    .trim()
    .max(100)
    .optional()
    .transform((value) => value || undefined),
});

export function parseCheckAvailabilityDto(
  query: unknown,
): MobileVersionIdentity {
  const result = checkAvailabilitySchema.safeParse(query);
  if (!result.success) {
    throw new BadRequestException(z.prettifyError(result.error));
  }
  return result.data;
}
