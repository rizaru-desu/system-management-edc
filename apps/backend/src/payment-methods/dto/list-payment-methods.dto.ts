import { BadRequestException } from '@nestjs/common';
import { z } from 'zod';
import { PAYMENT_METHOD_STATUSES } from '@repo/db/schema';

/**
 * Query string of GET /payment-methods. Numbers arrive as strings in a
 * query string, so pagination fields are coerced; the db layer clamps
 * pageSize to its own maximum.
 */
const listPaymentMethodsSchema = z.object({
  /** Case-insensitive substring match on the name. */
  search: z.string().optional(),
  status: z.enum(PAYMENT_METHOD_STATUSES).optional(),
  /** 1-based page number. */
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().optional(),
});

export type ListPaymentMethodsDto = z.infer<typeof listPaymentMethodsSchema>;

export function parseListPaymentMethodsDto(
  query: unknown,
): ListPaymentMethodsDto {
  const result = listPaymentMethodsSchema.safeParse(query ?? {});
  if (!result.success) {
    throw new BadRequestException(z.prettifyError(result.error));
  }
  return result.data;
}
