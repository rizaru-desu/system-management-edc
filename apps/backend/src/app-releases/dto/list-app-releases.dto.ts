import { BadRequestException } from '@nestjs/common';
import { z } from 'zod';
import type { ListMobileVersionsOptions } from '@repo/db';
import {
  APP_RELEASE_PLATFORMS,
  APP_RELEASE_UPDATE_TYPES,
} from './create-app-release.dto';

/**
 * Query-string filters of GET /app-releases. Everything arrives as strings,
 * so numbers are coerced and the status filter maps onto `isActive`.
 */
const listAppReleasesSchema = z.object({
  search: z
    .string()
    .trim()
    .max(200)
    .optional()
    .transform((value) => value || undefined),
  platform: z.enum(APP_RELEASE_PLATFORMS).optional(),
  updateType: z.enum(APP_RELEASE_UPDATE_TYPES).optional(),
  status: z.enum(['active', 'inactive']).optional(),
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(100).optional(),
});

export function parseListAppReleasesDto(
  query: unknown,
): ListMobileVersionsOptions {
  const result = listAppReleasesSchema.safeParse(query);
  if (!result.success) {
    throw new BadRequestException(z.prettifyError(result.error));
  }
  const { status, ...options } = result.data;
  return {
    ...options,
    isActive: status === undefined ? undefined : status === 'active',
  };
}
