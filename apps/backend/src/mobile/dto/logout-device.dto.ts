import { BadRequestException } from '@nestjs/common';
import { ApiProperty } from '@nestjs/swagger';
import { z } from 'zod';

export const logoutDeviceSchema = z.object({
  deviceId: z.string().min(1, 'deviceId is required'),
});

export type LogoutDeviceDto = z.infer<typeof logoutDeviceSchema>;

export function parseLogoutDeviceDto(body: unknown): LogoutDeviceDto {
  const result = logoutDeviceSchema.safeParse(body);
  if (!result.success) {
    throw new BadRequestException(z.prettifyError(result.error));
  }
  return result.data;
}

export class LogoutDeviceSwaggerDto {
  @ApiProperty({
    example: 'd9f8c12a-3e4b-5c6d-7e8f-9a0b1c2d3e4f',
    description: 'Unique identifier of the device logging out',
  })
  deviceId!: string;
}

export class LogoutDeviceResponseDataSwaggerDto {
  @ApiProperty({ example: 'd9f8c12a-3e4b-5c6d-7e8f-9a0b1c2d3e4f' })
  deviceId!: string;

  @ApiProperty({ example: 'INACTIVE' })
  status!: string;

  @ApiProperty({ example: '2026-08-05T02:30:00.000Z' })
  lastLogoutAt!: string;
}

export class LogoutDeviceResponseSwaggerDto {
  @ApiProperty({ example: true })
  success!: boolean;

  @ApiProperty({ example: 'Device logged out successfully' })
  message!: string;

  @ApiProperty({ type: LogoutDeviceResponseDataSwaggerDto })
  data!: LogoutDeviceResponseDataSwaggerDto;
}
