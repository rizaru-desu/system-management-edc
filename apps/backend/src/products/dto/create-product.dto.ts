import { BadRequestException } from '@nestjs/common';
import { z } from 'zod';
import { PRODUCT_CATEGORIES, PRODUCT_STATUSES } from '@repo/db/schema';

const MAX_TEXT_LENGTH = 500;

/** Optional free-text field: trimmed, with '' / undefined stored as null. */
const optionalText = z
  .string()
  .trim()
  .max(MAX_TEXT_LENGTH)
  .nullish()
  .transform((value) => (value ? value : null));

/**
 * One row of the standard completeness list: an Item Category reference,
 * whether the item is required, and the standard quantity per unit.
 */
const completenessItemSchema = z.object({
  itemCategoryId: z.string().min(1, 'itemCategoryId is required'),
  required: z.boolean().default(true),
  standardQty: z
    .number('standardQty must be a valid number')
    .int('standardQty must be a whole number')
    .positive('standardQty must be at least 1')
    .default(1),
});

/** The same item can never be listed twice on one product. */
const completenessItemsSchema = z
  .array(completenessItemSchema)
  .max(100)
  .refine(
    (items) =>
      new Set(items.map((item) => item.itemCategoryId)).size === items.length,
    { message: 'completenessItems must not repeat an item' },
  );

/**
 * One supported payment method: a Payment Method reference and whether
 * passing its transaction test is required during settlement.
 */
const paymentMethodLinkSchema = z.object({
  paymentMethodId: z.string().min(1, 'paymentMethodId is required'),
  required: z.boolean().default(true),
});

/** The same method can never be linked twice on one product. */
const paymentMethodsSchema = z
  .array(paymentMethodLinkSchema)
  .max(100)
  .refine(
    (methods) =>
      new Set(methods.map((method) => method.paymentMethodId)).size ===
      methods.length,
    { message: 'paymentMethods must not repeat a method' },
  );

/**
 * Shared field validators of the create/update forms. `status` carries no
 * default here on purpose: a default would survive `.partial()` and make
 * every PATCH silently force ACTIVE — the create schema adds it below.
 * Item Category existence is re-checked in the db layer's transactional
 * writes, where the referenced rows can be read consistently.
 */
export const productBaseSchema = z.object({
  modelName: z.string().trim().min(1, 'modelName is required').max(200),
  brand: z.string().trim().min(1, 'brand is required').max(200),
  category: z.enum(PRODUCT_CATEGORIES),
  description: optionalText,
  /** Photo URL; the console sends nothing until the upload flow exists. */
  photoUrl: optionalText,
  status: z.enum(PRODUCT_STATUSES),
  completenessItems: completenessItemsSchema,
  paymentMethods: paymentMethodsSchema,
});

const createProductSchema = productBaseSchema.extend({
  status: z.enum(PRODUCT_STATUSES).default('ACTIVE'),
  completenessItems: completenessItemsSchema.default([]),
  paymentMethods: paymentMethodsSchema.default([]),
});

export type CreateProductDto = z.infer<typeof createProductSchema>;

export function parseCreateProductDto(body: unknown): CreateProductDto {
  const result = createProductSchema.safeParse(body);
  if (!result.success) {
    throw new BadRequestException(z.prettifyError(result.error));
  }
  return result.data;
}
