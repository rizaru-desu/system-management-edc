import { BadRequestException } from '@nestjs/common';
import { z } from 'zod';
import { EDC_FOUND_STATUSES, EDC_ITEM_CONDITIONS } from '@repo/db/schema';

const MAX_TEXT_LENGTH = 500;

/**
 * Free-text field of a PATCH body: trimmed, '' stored as null — but the
 * `.optional()` sits *after* the transform on purpose. Were it before (as
 * in the create DTO, where every field is written anyway), an absent key
 * would still emit `null`, and the db layer's `!== undefined` check would
 * wipe the stored note on every unrelated toggle.
 */
const patchText = z
  .string()
  .trim()
  .max(MAX_TEXT_LENGTH)
  .nullable()
  .transform((value) => (value ? value : null))
  .optional();

/**
 * Body of PATCH /inbound-shipments/:id/edc-items/:itemId — one unit's
 * inspection result. Every field is optional so the workspace can send
 * just what the inspector touched (a toggle, a note, the checklist).
 * `completenessStatus` is deliberately absent: the db layer derives it
 * from the checklist, so a client can never mark an incomplete unit
 * complete and have it become a terminal.
 */
const updateEdcItemSchema = z
  .object({
    foundStatus: z.enum(EDC_FOUND_STATUSES).optional(),
    /** null clears the condition (a unit that turned out missing). */
    condition: z.enum(EDC_ITEM_CONDITIONS).nullish(),
    notes: patchText,
    photoUrl: patchText,
    /** Full checklist state; omitted leaves the stored checkboxes alone. */
    accessories: z
      .array(
        z.object({
          itemCategoryId: z.string().min(1, 'itemCategoryId is required'),
          isPresent: z.boolean(),
        }),
      )
      .optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'Provide at least one field to update',
  });

export type UpdateEdcItemDto = z.infer<typeof updateEdcItemSchema>;

export function parseUpdateEdcItemDto(body: unknown): UpdateEdcItemDto {
  const result = updateEdcItemSchema.safeParse(body);
  if (!result.success) {
    throw new BadRequestException(z.prettifyError(result.error));
  }
  return result.data;
}

/**
 * Body of POST /inbound-shipments/:id/edc-items — a serial found in the
 * delivery but absent from the paperwork. It lands FOUND/GOOD with a fresh
 * checklist, flagged unlisted for the discrepancy report.
 */
const addEdcItemSchema = z.object({
  serialNumber: z.string().trim().min(1, 'serialNumber is required').max(100),
  productId: z.string().min(1, 'productId is required'),
});

export type AddEdcItemDto = z.infer<typeof addEdcItemSchema>;

export function parseAddEdcItemDto(body: unknown): AddEdcItemDto {
  const result = addEdcItemSchema.safeParse(body);
  if (!result.success) {
    throw new BadRequestException(z.prettifyError(result.error));
  }
  return result.data;
}

/**
 * Body of PATCH /inbound-shipments/:id/peripheral-items/:itemId — the
 * counted quantity and note of one non-serialized line. null clears a
 * count back to "not yet counted".
 */
const updatePeripheralItemSchema = z
  .object({
    receivedQty: z.coerce
      .number()
      .int('receivedQty must be a whole number')
      .min(0, 'receivedQty cannot be negative')
      .nullish(),
    notes: patchText,
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'Provide at least one field to update',
  });

export type UpdatePeripheralItemDto = z.infer<
  typeof updatePeripheralItemSchema
>;

export function parseUpdatePeripheralItemDto(
  body: unknown,
): UpdatePeripheralItemDto {
  const result = updatePeripheralItemSchema.safeParse(body);
  if (!result.success) {
    throw new BadRequestException(z.prettifyError(result.error));
  }
  return result.data;
}
