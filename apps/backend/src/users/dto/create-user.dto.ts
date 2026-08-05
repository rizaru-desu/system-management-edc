import { BadRequestException } from '@nestjs/common';
import { z } from 'zod';
import { userAccountBaseSchema } from './update-user.dto';

/**
 * Better Auth's own password bounds (minPasswordLength/maxPasswordLength
 * defaults). `auth.api.createUser` hashes without validating length, so the
 * DTO enforces the same range the sign-in endpoints expect.
 */
const MIN_PASSWORD_LENGTH = 8;
const MAX_PASSWORD_LENGTH = 128;

const createUserSchema = userAccountBaseSchema
  .extend({
    /** Initial credential password, set by the admin who creates the account. */
    password: z
      .string()
      .min(
        MIN_PASSWORD_LENGTH,
        `password must be at least ${MIN_PASSWORD_LENGTH} characters`,
      )
      .max(MAX_PASSWORD_LENGTH),
  })
  // Unlike updates (where deactivating may strip every role), a brand-new
  // account always needs a role — otherwise Better Auth would silently fall
  // back to its default `user` role.
  .refine((data) => data.roles.length > 0, {
    message: 'assign at least one role',
    path: ['roles'],
  });

export type CreateUserDto = z.infer<typeof createUserSchema>;

export function parseCreateUserDto(body: unknown): CreateUserDto {
  const result = createUserSchema.safeParse(body);
  if (!result.success) {
    throw new BadRequestException(z.prettifyError(result.error));
  }
  return result.data;
}
