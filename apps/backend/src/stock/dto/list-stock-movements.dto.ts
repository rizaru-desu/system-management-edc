import { BadRequestException } from '@nestjs/common';
import { z } from 'zod';
import {
  EDC_MOVEMENT_TYPES,
  PERIPHERAL_MOVEMENT_REASONS,
} from '@repo/db/schema';

/** Shared list-filter fields of both movement logs. */
const movementFilterBase = {
  search: z.string().optional(),
  warehouseId: z.string().min(1).optional(),
  /** Inclusive yyyy-mm-dd bounds on the movement date (UTC). */
  dateFrom: z.iso.date('dateFrom must be a yyyy-mm-dd date').optional(),
  dateTo: z.iso.date('dateTo must be a yyyy-mm-dd date').optional(),
  /** 1-based page number. */
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().optional(),
};

/** Query string of GET /stock-movements (the EDC log). */
const listEdcMovementsSchema = z.object({
  ...movementFilterBase,
  movementType: z.enum(EDC_MOVEMENT_TYPES).optional(),
});

export type ListEdcMovementsDto = z.infer<typeof listEdcMovementsSchema>;

export function parseListEdcMovementsDto(query: unknown): ListEdcMovementsDto {
  const result = listEdcMovementsSchema.safeParse(query ?? {});
  if (!result.success) {
    throw new BadRequestException(z.prettifyError(result.error));
  }
  return result.data;
}

/** Query string of GET /stock-movements/peripherals. */
const listPeripheralMovementsSchema = z.object({
  ...movementFilterBase,
  reason: z.enum(PERIPHERAL_MOVEMENT_REASONS).optional(),
});

export type ListPeripheralMovementsDto = z.infer<
  typeof listPeripheralMovementsSchema
>;

export function parseListPeripheralMovementsDto(
  query: unknown,
): ListPeripheralMovementsDto {
  const result = listPeripheralMovementsSchema.safeParse(query ?? {});
  if (!result.success) {
    throw new BadRequestException(z.prettifyError(result.error));
  }
  return result.data;
}
