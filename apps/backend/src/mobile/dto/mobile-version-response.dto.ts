import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { z } from 'zod';

export const mobileVersionResponseSchema = z.object({
  updateAvailable: z.boolean(),
  updateType: z.enum(['ota', 'apk', 'none']),
  forceUpdate: z.boolean(),
  minimumVersion: z.string(),
  latestVersion: z.string(),
  releaseNotes: z.string(),
  // OTA specific fields
  channel: z.string().optional(),
  runtimeVersion: z.string().optional(),
  // APK specific fields
  version: z.string().optional(),
  downloadUrl: z.string(),
  updateUrl: z.string(),
  checksum: z.string(),
  fileSize: z.number(),
  publishedAt: z.string(),
  isActive: z.boolean(),
});

export type MobileVersionResponseDto = z.infer<
  typeof mobileVersionResponseSchema
>;

export class MobileVersionResponseSwaggerDto implements MobileVersionResponseDto {
  @ApiProperty({
    example: true,
    description: 'Whether an update is available for the client app',
  })
  updateAvailable!: boolean;

  @ApiProperty({
    example: 'ota',
    enum: ['ota', 'apk', 'none'],
    description: 'Strategy recommended for update delivery',
  })
  updateType!: 'ota' | 'apk' | 'none';

  @ApiProperty({
    example: false,
    description:
      'Whether update is mandatory and must be installed before app usage',
  })
  forceUpdate!: boolean;

  @ApiProperty({
    example: '1.0.0',
    description: 'Minimum supported app version',
  })
  minimumVersion!: string;

  @ApiProperty({
    example: '1.0.1',
    description: 'Latest available app version',
  })
  latestVersion!: string;

  @ApiProperty({
    example: 'Bug fixes and performance enhancements',
    description: 'Release notes or changelog for this version update',
  })
  releaseNotes!: string;

  @ApiPropertyOptional({
    example: 'production',
    description: 'Expo OTA update channel (present when updateType is ota)',
  })
  channel?: string;

  @ApiPropertyOptional({
    example: '1.0.0',
    description:
      'Expo runtime version requirement (present when updateType is ota)',
  })
  runtimeVersion?: string;

  @ApiPropertyOptional({
    example: '1.0.1',
    description:
      'Version string for standalone APK update (present when updateType is apk)',
  })
  version?: string;

  @ApiProperty({
    example: 'https://example.com/downloads/app-release.apk',
    description: 'Direct URL to download standalone APK file',
  })
  downloadUrl!: string;

  @ApiProperty({
    example: 'https://example.com/downloads/app-release.apk',
    description: 'URL to update or download application (legacy field)',
  })
  updateUrl!: string;

  @ApiProperty({
    example: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    description: 'SHA-256 or MD5 checksum for binary verification',
  })
  checksum!: string;

  @ApiProperty({
    example: 15420000,
    description: 'Size of the update file in bytes',
  })
  fileSize!: number;

  @ApiProperty({
    example: '2026-08-03T10:00:00.000Z',
    description: 'Publication date in ISO string format',
  })
  publishedAt!: string;

  @ApiProperty({
    example: true,
    description: 'Status indicating if version is active',
  })
  isActive!: boolean;
}
