import { BadRequestException } from '@nestjs/common';
import { z } from 'zod';
import { DISCREPANCY_PARTNER_RESPONSES } from '@repo/db/schema';

const MAX_TEXT_LENGTH = 500;

/** Optional free-text field: trimmed, with '' / undefined stored as null. */
const optionalText = z
  .string()
  .trim()
  .max(MAX_TEXT_LENGTH)
  .nullish()
  .transform((value) => (value ? value : null));

/**
 * Body of POST /inbound-shipments/:id/discrepancy/send — emails the
 * discrepancy report to the partner. The recipient defaults to the partner
 * account's PIC email when omitted; `message` is an optional covering note
 * included in the email body.
 */
const sendDiscrepancyReportSchema = z.object({
  recipientEmail: z
    .email('recipientEmail must be a valid email address')
    .nullish()
    .transform((value) => (value ? value : null)),
  message: optionalText,
});

export type SendDiscrepancyReportDto = z.infer<
  typeof sendDiscrepancyReportSchema
>;

export function parseSendDiscrepancyReportDto(
  body: unknown,
): SendDiscrepancyReportDto {
  const result = sendDiscrepancyReportSchema.safeParse(body ?? {});
  if (!result.success) {
    throw new BadRequestException(z.prettifyError(result.error));
  }
  return result.data;
}

/**
 * Body of POST /inbound-shipments/:id/discrepancy/confirm — records the
 * partner's answer to the report.
 */
const confirmDiscrepancySchema = z.object({
  partnerResponse: z.enum(DISCREPANCY_PARTNER_RESPONSES),
  notes: optionalText,
});

export type ConfirmDiscrepancyDto = z.infer<typeof confirmDiscrepancySchema>;

export function parseConfirmDiscrepancyDto(
  body: unknown,
): ConfirmDiscrepancyDto {
  const result = confirmDiscrepancySchema.safeParse(body);
  if (!result.success) {
    throw new BadRequestException(z.prettifyError(result.error));
  }
  return result.data;
}

/**
 * Body of POST /inbound-shipments/:id/discrepancy/resolve — closes the
 * case by hand (a completed follow-up shipment resolves it automatically).
 */
const resolveDiscrepancySchema = z.object({
  notes: optionalText,
});

export type ResolveDiscrepancyDto = z.infer<typeof resolveDiscrepancySchema>;

export function parseResolveDiscrepancyDto(
  body: unknown,
): ResolveDiscrepancyDto {
  const result = resolveDiscrepancySchema.safeParse(body ?? {});
  if (!result.success) {
    throw new BadRequestException(z.prettifyError(result.error));
  }
  return result.data;
}
