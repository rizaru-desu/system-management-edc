import { BadRequestException } from '@nestjs/common';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { z } from 'zod';

export const registerDeviceSchema = z.object({
  deviceId: z.string().min(1, 'deviceId is required'),
  platform: z.string().optional().default('android'),
  brand: z.string().optional(),
  manufacturer: z.string().optional(),
  model: z.string().optional(),
  androidVersion: z.string().optional(),
  sdkVersion: z.string().optional(),
  appVersion: z.string().optional(),
  buildNumber: z.string().optional(),
  carrier: z.string().nullish(),
  networkType: z.string().optional(),
  isRooted: z.boolean().optional().default(false),
  isDeveloperMode: z.boolean().optional().default(false),
  isEmulator: z.boolean().optional().default(false),
  fcmToken: z.string().nullish(),
});

export type RegisterDeviceDto = z.infer<typeof registerDeviceSchema>;

export function parseRegisterDeviceDto(body: unknown): RegisterDeviceDto {
  const result = registerDeviceSchema.safeParse(body);
  if (!result.success) {
    throw new BadRequestException(z.prettifyError(result.error));
  }
  return result.data;
}

export class RegisterDeviceSwaggerDto {
  @ApiProperty({
    example: 'd9f8c12a-3e4b-5c6d-7e8f-9a0b1c2d3e4f',
    description:
      'Unique identifier for the mobile device hardware or installation',
  })
  deviceId!: string;

  @ApiPropertyOptional({
    example: 'android',
    default: 'android',
    description: 'Operating system platform',
  })
  platform?: string;

  @ApiPropertyOptional({
    example: 'Samsung',
    description: 'Device brand name',
  })
  brand?: string;

  @ApiPropertyOptional({
    example: 'samsung',
    description: 'Device hardware manufacturer',
  })
  manufacturer?: string;

  @ApiPropertyOptional({
    example: 'SM-G998B',
    description: 'Device hardware model',
  })
  model?: string;

  @ApiPropertyOptional({
    example: '14',
    description: 'Android OS version',
  })
  androidVersion?: string;

  @ApiPropertyOptional({
    example: '34',
    description: 'Android SDK API level',
  })
  sdkVersion?: string;

  @ApiPropertyOptional({
    example: '1.0.0',
    description: 'Installed mobile app version',
  })
  appVersion?: string;

  @ApiPropertyOptional({
    example: '1',
    description: 'Mobile app internal build number',
  })
  buildNumber?: string;

  @ApiPropertyOptional({
    example: 'Telkomsel',
    description: 'Active cellular carrier / network operator',
  })
  carrier?: string;

  @ApiPropertyOptional({
    example: 'WIFI',
    description: 'Current network connection type (e.g. WIFI, 4G, 5G)',
  })
  networkType?: string;

  @ApiPropertyOptional({
    example: false,
    default: false,
    description: 'Indicates if the device is rooted or jailbroken',
  })
  isRooted?: boolean;

  @ApiPropertyOptional({
    example: false,
    default: false,
    description: 'Indicates if Android Developer Options are enabled',
  })
  isDeveloperMode?: boolean;

  @ApiPropertyOptional({
    example: false,
    default: false,
    description: 'Indicates if the app is running in an emulator or simulator',
  })
  isEmulator?: boolean;

  @ApiPropertyOptional({
    example: 'f9a8b7c6d5e4...',
    description: 'Firebase Cloud Messaging (FCM) device push token',
  })
  fcmToken?: string;
}

export class RegisterDeviceResponseDataSwaggerDto {
  @ApiProperty({ example: 'd9f8c12a-3e4b-5c6d-7e8f-9a0b1c2d3e4f' })
  deviceId!: string;

  @ApiProperty({ example: 'ACTIVE' })
  status!: string;

  @ApiProperty({ example: 3 })
  loginCount!: number;

  @ApiProperty({ example: '2026-08-05T02:00:00.000Z' })
  lastLoginAt!: string;
}

export class RegisterDeviceResponseSwaggerDto {
  @ApiProperty({ example: true })
  success!: boolean;

  @ApiProperty({ example: 'Device registered successfully' })
  message!: string;

  @ApiProperty({ type: RegisterDeviceResponseDataSwaggerDto })
  data!: RegisterDeviceResponseDataSwaggerDto;
}
