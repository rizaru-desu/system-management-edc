import { BadRequestException } from '@nestjs/common';
import { z } from 'zod';

/** Ceiling on rows per import request — one Excel sheet, not a data dump. */
export const MAX_IMPORT_ROWS = 1000;

/**
 * One raw cell as parsed from the Excel sheet: SheetJS yields strings or
 * numbers depending on the cell type, and empty cells are simply absent.
 * Semantic validation (required fields, coordinate ranges, formats) happens
 * per row in the import service so one bad row never rejects the request.
 */
const cellSchema = z.union([z.string(), z.number()]).nullish();

const importRowSchema = z.object({
  merchantCode: cellSchema,
  merchantName: cellSchema,
  merchantType: cellSchema,
  picName: cellSchema,
  phoneNumber: cellSchema,
  email: cellSchema,
  address: cellSchema,
  province: cellSchema,
  city: cellSchema,
  district: cellSchema,
  postalCode: cellSchema,
  latitude: cellSchema,
  longitude: cellSchema,
  status: cellSchema,
});

export type ImportMerchantRowDto = z.infer<typeof importRowSchema>;

const importMerchantsSchema = z.object({
  rows: z
    .array(importRowSchema)
    .min(1, 'provide at least one row')
    .max(MAX_IMPORT_ROWS, `at most ${MAX_IMPORT_ROWS} rows per import`),
});

export type ImportMerchantsDto = z.infer<typeof importMerchantsSchema>;

export function parseImportMerchantsDto(body: unknown): ImportMerchantsDto {
  const result = importMerchantsSchema.safeParse(body);
  if (!result.success) {
    throw new BadRequestException(z.prettifyError(result.error));
  }
  return result.data;
}
