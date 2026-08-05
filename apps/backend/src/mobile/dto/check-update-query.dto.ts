import { ApiPropertyOptional } from '@nestjs/swagger';
import { z } from 'zod';

export const checkUpdateQuerySchema = z.object({
  currentVersion: z.string().optional(),
  platform: z.string().optional().default('android'),
  runtimeVersion: z.string().optional(),
  channel: z.string().optional(),
});

export type CheckUpdateQueryDto = z.infer<typeof checkUpdateQuerySchema>;

export class CheckUpdateQuerySwaggerDto {
  @ApiPropertyOptional({
    example: '1.0.0',
    description: 'Current installed app version running on the client device',
  })
  currentVersion?: string;

  @ApiPropertyOptional({
    example: 'android',
    default: 'android',
    description: 'Client device platform',
  })
  platform?: string;

  @ApiPropertyOptional({
    example: '1.0.0',
    description: 'Expo runtime version configured in client app',
  })
  runtimeVersion?: string;

  @ApiPropertyOptional({
    example: 'production',
    description: 'OTA release channel (e.g. production, preview, staging)',
  })
  channel?: string;
}
