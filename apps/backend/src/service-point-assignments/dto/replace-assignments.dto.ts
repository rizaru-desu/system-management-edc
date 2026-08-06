import { BadRequestException } from '@nestjs/common';
import { z } from 'zod';
import { ROLES_AT_SERVICE_POINT } from '@repo/db/schema';

const assignmentEntrySchema = z.object({
  servicePointId: z.string().min(1),
  roleAtServicePoint: z.enum(ROLES_AT_SERVICE_POINT),
  isDefault: z.boolean().default(false),
});

/**
 * Body of PUT /users/:userId/service-points — the user's complete desired
 * assignment set (an empty list unassigns everything). Shape rules live
 * here; referential checks (user/service point existence) live in the db
 * layer's transaction:
 *
 * - a service point may appear only once,
 * - a single assignment is made the default automatically,
 * - two or more assignments must mark exactly one default.
 */
const replaceAssignmentsSchema = z
  .object({
    assignments: z.array(assignmentEntrySchema),
  })
  .superRefine((data, ctx) => {
    const seen = new Set<string>();
    for (const [index, entry] of data.assignments.entries()) {
      if (seen.has(entry.servicePointId)) {
        ctx.addIssue({
          code: 'custom',
          message: `duplicate service point "${entry.servicePointId}"`,
          path: ['assignments', index, 'servicePointId'],
        });
      }
      seen.add(entry.servicePointId);
    }

    const defaults = data.assignments.filter((entry) => entry.isDefault);
    if (data.assignments.length > 1 && defaults.length !== 1) {
      ctx.addIssue({
        code: 'custom',
        message: `mark exactly one service point as default (got ${defaults.length})`,
        path: ['assignments'],
      });
    }
  })
  .transform((data) => ({
    assignments: data.assignments.map((entry, index) => ({
      ...entry,
      // A single assignment is always the default.
      isDefault: data.assignments.length === 1 ? index === 0 : entry.isDefault,
    })),
  }));

export type ReplaceAssignmentsDto = z.infer<typeof replaceAssignmentsSchema>;

export function parseReplaceAssignmentsDto(
  body: unknown,
): ReplaceAssignmentsDto {
  const result = replaceAssignmentsSchema.safeParse(body);
  if (!result.success) {
    throw new BadRequestException(z.prettifyError(result.error));
  }
  return result.data;
}
