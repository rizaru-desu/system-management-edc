import { BadRequestException } from '@nestjs/common';
import { z } from 'zod';

/**
 * The stored role key of the System Administrator role (see `@repo/auth`
 * permissions.ts). Exclusive: it grants everything, so it never combines
 * with other roles, and only System Administrator callers may assign or
 * remove it.
 */
export const SYS_ADMIN_ROLE = 'System_Administrator';

const MAX_ROLES_PER_USER = 20;

/**
 * Role keys as stored in `user.role`: console role keys such as
 * `System_Administrator` or `Operations_Specialist` — one wording shared with
 * the Better Auth role catalogue. Pattern-validated only (like the permission-matrix
 * DTO) — the role catalogue lives in the frontend menu data. Commas are
 * excluded by the pattern, so a key can never corrupt the comma-separated
 * `user.role` list.
 */
const roleKeySchema = z
  .string()
  .min(1)
  .max(100)
  .regex(
    /^[A-Za-z0-9][A-Za-z0-9_-]*$/,
    'must contain only letters, digits, "_" or "-"',
  );

/**
 * Fields shared by the create- and update-user DTOs (create adds a
 * password on top — see create-user.dto.ts).
 */
export const userAccountBaseSchema = z.object({
  name: z.string().trim().min(1, 'name is required').max(200),
  email: z.string().trim().toLowerCase().max(254).pipe(z.email()),
  /** May be empty only while banned — see the object-level refine below. */
  roles: z
    .array(roleKeySchema)
    .max(MAX_ROLES_PER_USER)
    .transform((roles) => [...new Set(roles)])
    .refine((roles) => !roles.includes(SYS_ADMIN_ROLE) || roles.length === 1, {
      message: `${SYS_ADMIN_ROLE} is exclusive and cannot be combined with other roles`,
    }),
  /** `true` = inactive: the console maps "Active account" onto ban/unban. */
  banned: z.boolean(),
  /**
   * Optional note shown on the console's Inactive badge; stored in Better
   * Auth's `banReason` column. Blank strings normalize to null, and the
   * service ignores it entirely unless `banned` is true.
   */
  banReason: z
    .string()
    .trim()
    .max(500)
    .nullish()
    .transform((value) => value || null),
});

// Deactivating may strip every role; an active account needs at least one.
const updateUserSchema = userAccountBaseSchema.refine(
  (data) => data.banned || data.roles.length > 0,
  {
    message: 'assign at least one role for an active account',
    path: ['roles'],
  },
);

export type UpdateUserDto = z.infer<typeof updateUserSchema>;

export function parseUpdateUserDto(body: unknown): UpdateUserDto {
  const result = updateUserSchema.safeParse(body);
  if (!result.success) {
    throw new BadRequestException(z.prettifyError(result.error));
  }
  return result.data;
}
