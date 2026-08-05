import { BadRequestException } from '@nestjs/common';
import { z } from 'zod';

/**
 * Sanity bounds on the matrix payload. The real catalogues (5 roles, ~15
 * modules) live in the frontend menu data; these only cap what a client can
 * persist, they do not validate against the catalogue.
 */
const MAX_ROLES = 50;
const MAX_MODULES_PER_ROLE = 200;

/** Role keys / module paths, e.g. `Operations_Specialist`, `stock-movements`. */
const keySchema = z
  .string()
  .min(1)
  .max(100)
  .regex(
    /^[A-Za-z0-9][A-Za-z0-9_-]*$/,
    'must contain only letters, digits, "_" or "-"',
  );

/** V/C/U/D flags for one module. */
const permissionFlagsSchema = z.object({
  view: z.boolean(),
  create: z.boolean(),
  update: z.boolean(),
  delete: z.boolean(),
});

/** matrix[roleKey][modulePath] → V/C/U/D flags. */
const saveRolePermissionsSchema = z.object({
  matrix: z
    .record(
      keySchema,
      z
        .record(keySchema, permissionFlagsSchema)
        .refine(
          (modules) => Object.keys(modules).length <= MAX_MODULES_PER_ROLE,
          {
            message: `a role can hold at most ${MAX_MODULES_PER_ROLE} modules`,
          },
        ),
    )
    .refine((matrix) => Object.keys(matrix).length <= MAX_ROLES, {
      message: `a save can hold at most ${MAX_ROLES} roles`,
    }),
});

export type PermissionFlags = z.infer<typeof permissionFlagsSchema>;
export type PermissionMatrix = z.infer<
  typeof saveRolePermissionsSchema
>['matrix'];
export type SaveRolePermissionsDto = z.infer<typeof saveRolePermissionsSchema>;

export function parseSaveRolePermissionsDto(
  body: unknown,
): SaveRolePermissionsDto {
  const result = saveRolePermissionsSchema.safeParse(body);
  if (!result.success) {
    throw new BadRequestException(z.prettifyError(result.error));
  }
  return result.data;
}
