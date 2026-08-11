import { BadRequestException } from '@nestjs/common';
import { z } from 'zod';
import { terminalBaseSchema } from './create-terminal.dto';

/**
 * PATCH body: any subset of the create fields. Omitted fields stay
 * untouched. A status or warehouse change is logged into the terminal
 * status history inside the db layer's transactional update.
 */
const updateTerminalSchema = terminalBaseSchema
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: 'provide at least one field to update',
  });

export type UpdateTerminalDto = z.infer<typeof updateTerminalSchema>;

export function parseUpdateTerminalDto(body: unknown): UpdateTerminalDto {
  const result = updateTerminalSchema.safeParse(body);
  if (!result.success) {
    throw new BadRequestException(z.prettifyError(result.error));
  }
  return result.data;
}
