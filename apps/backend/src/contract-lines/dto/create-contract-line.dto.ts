import { BadRequestException } from '@nestjs/common';
import { z } from 'zod';
import { CONTRACT_LINE_STATUSES, DOCUMENT_STATUSES } from '@repo/db/schema';

const MAX_TEXT_LENGTH = 500;

/** Optional free-text field: trimmed, with '' / undefined stored as null. */
const optionalText = z
  .string()
  .trim()
  .max(MAX_TEXT_LENGTH)
  .nullish()
  .transform((value) => (value ? value : null));

/** Optional calendar date (YYYY-MM-DD); '' / undefined stored as null. */
const optionalDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'must be a YYYY-MM-DD date')
  .nullish()
  .or(z.literal(''))
  .transform((value) => (value ? value : null));

/**
 * Shared field validators of the create/update forms. `status` and
 * `documentStatus` carry no defaults here on purpose: a default would
 * survive `.partial()` and make every PATCH silently force it — the create
 * schema adds them below. The end-on-or-after-start rule lives with the
 * parse functions because `.partial()` would otherwise lose it.
 */
export const contractLineBaseSchema = z.object({
  lineNumber: z.string().trim().min(1, 'lineNumber is required').max(50),
  lineName: z.string().trim().min(1, 'lineName is required').max(200),
  status: z.enum(CONTRACT_LINE_STATUSES),
  documentStatus: z.enum(DOCUMENT_STATUSES),
  vendorEdc: optionalText,
  /** Live account the line belongs to. */
  accountId: z.string().trim().min(1, 'accountId is required'),
  /** Live project the line belongs to. */
  projectId: z.string().trim().min(1, 'projectId is required'),
  serviceItem: optionalText,
  startDate: optionalDate,
  endDate: optionalDate,
  notes: optionalText,
});

/** End date may not precede the start date when both are present. */
function datesOrdered(data: {
  startDate?: string | null;
  endDate?: string | null;
}): boolean {
  if (!data.startDate || !data.endDate) return true;
  return data.endDate >= data.startDate;
}

const createContractLineSchema = contractLineBaseSchema
  .extend({
    status: z.enum(CONTRACT_LINE_STATUSES).default('ACTIVE'),
    documentStatus: z.enum(DOCUMENT_STATUSES).default('DRAFT'),
  })
  .refine(datesOrdered, {
    message: 'endDate must be on or after startDate',
    path: ['endDate'],
  });

export type CreateContractLineDto = z.infer<typeof createContractLineSchema>;

export function parseCreateContractLineDto(
  body: unknown,
): CreateContractLineDto {
  const result = createContractLineSchema.safeParse(body);
  if (!result.success) {
    throw new BadRequestException(z.prettifyError(result.error));
  }
  return result.data;
}

export { datesOrdered };
