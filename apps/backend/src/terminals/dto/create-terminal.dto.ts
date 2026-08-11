import { BadRequestException } from '@nestjs/common';
import { z } from 'zod';
import { TERMINAL_CONDITIONS, TERMINAL_STATUSES } from '@repo/db/schema';

const MAX_TEXT_LENGTH = 500;

/** Optional free-text field: trimmed, with '' / undefined stored as null. */
const optionalText = z
  .string()
  .trim()
  .max(MAX_TEXT_LENGTH)
  .nullish()
  .transform((value) => (value ? value : null));

/** Optional reference id: '' / undefined stored as null. */
const optionalId = z
  .string()
  .nullish()
  .transform((value) => (value ? value : null));

/**
 * Shared field validators of the create/update forms. `status` carries no
 * default here on purpose: a default would survive `.partial()` and make
 * every PATCH silently force IN_STOCK — the create schema adds it below.
 * Referential rules (product/warehouse/merchant existence, merchant only
 * while INSTALLED) live in the db layer's transactional writes.
 */
export const terminalBaseSchema = z.object({
  serialNumber: z.string().trim().min(1, 'serialNumber is required').max(100),
  productId: z.string().min(1, 'productId is required'),
  /** null = in transit with no fixed warehouse. */
  warehouseId: optionalId,
  status: z.enum(TERMINAL_STATUSES),
  condition: z.enum(TERMINAL_CONDITIONS),
  merchantId: optionalId,
  notes: optionalText,
  /** Calendar date (yyyy-mm-dd) the unit entered the system. */
  enteredSystemAt: z.iso.date('enteredSystemAt must be a yyyy-mm-dd date'),
});

const createTerminalSchema = terminalBaseSchema.extend({
  status: z.enum(TERMINAL_STATUSES).default('IN_STOCK'),
});

export type CreateTerminalDto = z.infer<typeof createTerminalSchema>;

export function parseCreateTerminalDto(body: unknown): CreateTerminalDto {
  const result = createTerminalSchema.safeParse(body);
  if (!result.success) {
    throw new BadRequestException(z.prettifyError(result.error));
  }
  return result.data;
}
