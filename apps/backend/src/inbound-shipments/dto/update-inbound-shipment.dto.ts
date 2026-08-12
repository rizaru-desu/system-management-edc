import { BadRequestException } from '@nestjs/common';
import { z } from 'zod';
import { inboundShipmentBaseSchema } from './create-inbound-shipment.dto';

/**
 * Body of PUT /inbound-shipments/:id — a full replacement of the header
 * and both manifests, mirroring the wizard's own payload. The db layer
 * rejects it once inspection has started, since rewriting the manifest
 * then would discard recorded results.
 */
const updateInboundShipmentSchema = inboundShipmentBaseSchema;

export type UpdateInboundShipmentDto = z.infer<
  typeof updateInboundShipmentSchema
>;

export function parseUpdateInboundShipmentDto(
  body: unknown,
): UpdateInboundShipmentDto {
  const result = updateInboundShipmentSchema.safeParse(body);
  if (!result.success) {
    throw new BadRequestException(z.prettifyError(result.error));
  }
  return result.data;
}
