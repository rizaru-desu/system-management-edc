import { BadRequestException } from '@nestjs/common';
import { z } from 'zod';

export const APP_RELEASE_PLATFORMS = ['android', 'ios'] as const;
export const APP_RELEASE_UPDATE_TYPES = ['apk', 'ota'] as const;

/** Dotted numeric version, e.g. "1.0.0" or "2.14.3.1". */
const versionString = z
  .string()
  .trim()
  .regex(/^\d+(\.\d+){1,3}$/, 'must be a dotted numeric version, e.g. 1.0.0');

/** Optional free-text field: trimmed, with null/undefined stored as ''. */
const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .nullish()
    .transform((value) => value ?? '');

/**
 * Shared field validators of the create/update forms. Field names follow the
 * `mobile_version` table (latestVersion / releaseNotes) so the admin API and
 * the mobile check-update endpoint speak the same shape.
 */
export const appReleaseBaseSchema = z.object({
  platform: z.enum(APP_RELEASE_PLATFORMS),
  updateType: z.enum(APP_RELEASE_UPDATE_TYPES),
  latestVersion: versionString,
  versionCode: z.number().int().min(0),
  minimumVersion: versionString,
  downloadUrl: z
    .url()
    .max(2000)
    .nullish()
    .or(z.literal(''))
    .transform((value) => value ?? ''),
  releaseNotes: optionalText(10_000),
  fileSize: z.number().int().min(0),
  checksum: optionalText(200),
  forceUpdate: z.boolean(),
  isActive: z.boolean(),
  channel: optionalText(100).transform((value) => value || 'production'),
  runtimeVersion: z
    .string()
    .trim()
    .max(50)
    .nullish()
    .transform((value) => value || '1.0.0'),
  /** ISO timestamp; null/omitted lets publishing stamp it later. */
  publishedAt: z.coerce
    .date()
    .nullish()
    .transform((value) => value ?? null),
});

const createAppReleaseSchema = appReleaseBaseSchema.extend({
  platform: z.enum(APP_RELEASE_PLATFORMS).default('android'),
  updateType: z.enum(APP_RELEASE_UPDATE_TYPES).default('apk'),
  versionCode: z.number().int().min(0).default(0),
  fileSize: z.number().int().min(0).default(0),
  forceUpdate: z.boolean().default(false),
  isActive: z.boolean().default(false),
});

export type CreateAppReleaseDto = z.infer<typeof createAppReleaseSchema>;

export function parseCreateAppReleaseDto(body: unknown): CreateAppReleaseDto {
  const result = createAppReleaseSchema.safeParse(body);
  if (!result.success) {
    throw new BadRequestException(z.prettifyError(result.error));
  }
  return result.data;
}
