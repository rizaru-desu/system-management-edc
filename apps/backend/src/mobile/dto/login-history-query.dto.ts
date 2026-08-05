import { BadRequestException } from '@nestjs/common';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { z } from 'zod';

export const loginHistoryQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  search: z.string().trim().min(1).optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  eventType: z.enum(['login', 'logout']).default('login'),
  status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
  deviceId: z.string().trim().min(1).optional(),
});

export type LoginHistoryQueryDto = z.infer<typeof loginHistoryQuerySchema>;

export function parseLoginHistoryQueryDto(
  query: unknown,
): LoginHistoryQueryDto {
  const result = loginHistoryQuerySchema.safeParse(query);
  if (!result.success) {
    throw new BadRequestException(z.prettifyError(result.error));
  }
  return result.data;
}

export class LoginHistoryQuerySwaggerDto {
  @ApiPropertyOptional({
    example: 1,
    default: 1,
    description: '1-based page number',
  })
  page?: number;

  @ApiPropertyOptional({
    example: 50,
    default: 50,
    maximum: 100,
    description: 'Page size (max 100)',
  })
  limit?: number;

  @ApiPropertyOptional({
    example: 'Samsung',
    description:
      'Case-insensitive match against device name (brand/model), device ID, or IP address',
  })
  search?: string;

  @ApiPropertyOptional({
    example: '2026-08-01T00:00:00.000Z',
    description: 'Only events at or after this timestamp (ISO 8601)',
  })
  from?: string;

  @ApiPropertyOptional({
    example: '2026-08-31T23:59:59.999Z',
    description: 'Only events at or before this timestamp (ISO 8601)',
  })
  to?: string;

  @ApiPropertyOptional({
    enum: ['login', 'logout'],
    default: 'login',
    description:
      'History stream to read; defaults to "login" (the original endpoint behavior)',
  })
  eventType?: 'login' | 'logout';

  @ApiPropertyOptional({
    enum: ['ACTIVE', 'INACTIVE'],
    description: "Filter by the device's current status in the device registry",
  })
  status?: 'ACTIVE' | 'INACTIVE';

  @ApiPropertyOptional({
    example: 'd9f8c12a-3e4b-5c6d-7e8f-9a0b1c2d3e4f',
    description: 'Restrict to a single device ID (exact match)',
  })
  deviceId?: string;
}

export class LoginHistoryItemSwaggerDto {
  @ApiProperty({ example: '0b9f1f6e-8a4d-4c2f-9d3e-5a6b7c8d9e0f' })
  id!: string;

  @ApiProperty({ enum: ['login', 'logout'], example: 'login' })
  eventType!: 'login' | 'logout';

  @ApiProperty({ example: 'd9f8c12a-3e4b-5c6d-7e8f-9a0b1c2d3e4f' })
  deviceId!: string;

  @ApiProperty({ example: 'android', nullable: true })
  platform!: string | null;

  @ApiProperty({ example: 'Samsung', nullable: true })
  brand!: string | null;

  @ApiProperty({ example: 'SM-A536E', nullable: true })
  model!: string | null;

  @ApiProperty({ example: '1.2.0', nullable: true })
  appVersion!: string | null;

  @ApiProperty({ example: '203.0.113.7', nullable: true })
  ipAddress!: string | null;

  @ApiProperty({ example: 'okhttp/4.12.0', nullable: true })
  userAgent!: string | null;

  @ApiProperty({
    example: '2026-08-05T02:30:00.000Z',
    description: 'Event timestamp (logout time for eventType "logout")',
  })
  loginAt!: string;
}

export class LoginHistoryPageResponseSwaggerDto {
  @ApiProperty({ example: true })
  success!: boolean;

  @ApiProperty({
    type: [LoginHistoryItemSwaggerDto],
    description: 'Legacy alias of `items` kept for backward compatibility',
  })
  data!: LoginHistoryItemSwaggerDto[];

  @ApiProperty({ type: [LoginHistoryItemSwaggerDto] })
  items!: LoginHistoryItemSwaggerDto[];

  @ApiProperty({ example: 137, description: 'Total rows matching the filters' })
  total!: number;

  @ApiProperty({ example: 1 })
  page!: number;

  @ApiProperty({ example: 50 })
  limit!: number;

  @ApiProperty({ example: true })
  hasNext!: boolean;
}
