import { BadRequestException } from '@nestjs/common';
import { z } from 'zod';
import { WAREHOUSE_TYPES } from '@repo/db/schema';

/**
 * Query string of GET /stock-levels/edc and /stock-levels/peripherals.
 * `productId` only applies to the EDC endpoint and `itemCategoryId` only
 * to the peripheral one; the other is simply ignored by the query.
 */
const stockLevelFiltersSchema = z.object({
  warehouseId: z.string().min(1).optional(),
  warehouseType: z.enum(WAREHOUSE_TYPES).optional(),
  productId: z.string().min(1).optional(),
  itemCategoryId: z.string().min(1).optional(),
});

export type StockLevelFiltersDto = z.infer<typeof stockLevelFiltersSchema>;

export function parseStockLevelFiltersDto(
  query: unknown,
): StockLevelFiltersDto {
  const result = stockLevelFiltersSchema.safeParse(query ?? {});
  if (!result.success) {
    throw new BadRequestException(z.prettifyError(result.error));
  }
  return result.data;
}
