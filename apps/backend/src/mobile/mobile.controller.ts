import { Body, Controller, Get, Param, Post, Query, Req } from '@nestjs/common';
import {
  ApiBody,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import {
  Public,
  Session,
  type UserSession,
} from '@thallesp/nestjs-better-auth';
import type { Request } from 'express';
import { sessionUser } from '../auth/session-user';
import { RequirePermission } from '../permissions/require-permission.decorator';
import { MobileService } from './mobile.service';
import {
  CheckUpdateQuerySwaggerDto,
  checkUpdateQuerySchema,
} from './dto/check-update-query.dto';
import {
  LogoutDeviceSwaggerDto,
  LogoutDeviceResponseSwaggerDto,
  parseLogoutDeviceDto,
} from './dto/logout-device.dto';
import { MobileVersionResponseSwaggerDto } from './dto/mobile-version-response.dto';
import type { MobileVersionResponseDto } from './dto/mobile-version-response.dto';
import {
  RegisterDeviceSwaggerDto,
  RegisterDeviceResponseSwaggerDto,
  parseRegisterDeviceDto,
} from './dto/register-device.dto';

@ApiTags('mobile')
@Controller('mobile')
export class MobileController {
  constructor(private readonly mobileService: MobileService) {}

  /**
   * Hybrid check-update endpoint.
   * Compares the client's current app version against the active release,
   * then returns the appropriate update strategy payload (OTA or APK).
   * Fully backward-compatible: clients that omit `currentVersion` still receive a valid response.
   */
  @Public()
  @Get('version')
  @ApiOperation({
    summary: 'Check for available app updates (hybrid OTA / APK)',
    description:
      "Compares the client's `currentVersion` against the active release. " +
      'Returns `updateType: "ota"` for Expo OTA updates or `updateType: "apk"` for ' +
      'standalone APK downloads. ' +
      'Clients that do not send `currentVersion` receive the full active version payload for ' +
      'backward compatibility.',
  })
  @ApiQuery({
    name: 'currentVersion',
    required: false,
    type: String,
    example: '1.0.0',
    description: 'Current installed app version',
  })
  @ApiQuery({
    name: 'platform',
    required: false,
    type: String,
    example: 'android',
    description: 'Client platform',
  })
  @ApiQuery({
    name: 'runtimeVersion',
    required: false,
    type: String,
    example: '1.0.0',
    description: 'Expo runtime version',
  })
  @ApiQuery({
    name: 'channel',
    required: false,
    type: String,
    example: 'production',
    description: 'OTA release channel',
  })
  @ApiResponse({
    status: 200,
    description:
      'Update check result — contains update strategy and version metadata',
    type: MobileVersionResponseSwaggerDto,
  })
  @ApiResponse({
    status: 404,
    description: 'No active mobile version found for the requested platform',
  })
  async getVersion(
    @Query() rawQuery: CheckUpdateQuerySwaggerDto,
  ): Promise<MobileVersionResponseDto> {
    const query = checkUpdateQuerySchema.parse(rawQuery);
    return this.mobileService.checkUpdate(query);
  }

  /**
   * Registers or updates a mobile device upon login.
   * Upserts the (userId + deviceId) row, increments login count, marks status as ACTIVE,
   * updates latest telemetry, and logs to mobile_login_history.
   */
  @Post('device/register')
  @ApiOperation({
    summary: 'Register or update mobile device telemetry upon login',
    description:
      'Upserts the device record for the authenticated user, increments the login count, ' +
      'marks device status as ACTIVE, updates telemetry, and logs to mobile_login_history. ' +
      'User ID is strictly derived from the active Better Auth session.',
  })
  @ApiBody({ type: RegisterDeviceSwaggerDto })
  @ApiResponse({
    status: 200,
    description: 'Device registered successfully',
    type: RegisterDeviceResponseSwaggerDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Validation failed on device payload',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized — requires valid Better Auth session',
  })
  async registerDevice(
    @Body() rawBody: unknown,
    @Session() session: UserSession,
    @Req() req: Request,
  ) {
    const caller = sessionUser(session);
    const dto = parseRegisterDeviceDto(rawBody);
    const ipAddress = (req.ip || req.headers['x-forwarded-for']) as
      string | undefined;
    const userAgent = req.headers['user-agent'];

    return this.mobileService.registerDevice(caller.id, dto, {
      ipAddress,
      userAgent,
    });
  }

  /**
   * Deactivates a mobile device upon logout.
   * Marks the device status as INACTIVE, records lastLogoutAt, and logs to mobile_logout_history.
   */
  @Post('device/logout')
  @ApiOperation({
    summary: 'Deactivate mobile device upon logout',
    description:
      'Marks the device status as INACTIVE, records lastLogoutAt, and logs to mobile_logout_history. ' +
      'User ID is strictly derived from the active Better Auth session.',
  })
  @ApiBody({ type: LogoutDeviceSwaggerDto })
  @ApiResponse({
    status: 200,
    description: 'Device logged out successfully',
    type: LogoutDeviceResponseSwaggerDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Validation failed on logout payload',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized — requires valid Better Auth session',
  })
  async logoutDevice(
    @Body() rawBody: unknown,
    @Session() session: UserSession,
    @Req() req: Request,
  ) {
    const caller = sessionUser(session);
    const dto = parseLogoutDeviceDto(rawBody);
    const ipAddress = (req.ip || req.headers['x-forwarded-for']) as
      string | undefined;
    const userAgent = req.headers['user-agent'];

    return this.mobileService.logoutDevice(caller.id, dto, {
      ipAddress,
      userAgent,
    });
  }

  /**
   * Lists all registered mobile devices for a given user.
   * Requires the "users" module "view" permission (same as Users & Roles).
   */
  @Get('users/:userId/devices')
  @RequirePermission('users', 'view')
  @ApiOperation({ summary: 'List registered devices for a user (admin)' })
  @ApiResponse({ status: 200, description: 'Device list' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  listDevices(@Param('userId') userId: string) {
    return this.mobileService.listDevices(userId);
  }

  /**
   * Lists mobile login history for a given user.
   */
  @Get('users/:userId/login-history')
  @RequirePermission('users', 'view')
  @ApiOperation({ summary: 'List mobile login history for a user (admin)' })
  @ApiResponse({ status: 200, description: 'Login history list' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  listLoginHistory(@Param('userId') userId: string) {
    return this.mobileService.listLoginHistory(userId);
  }

  /**
   * Lists active sessions for a given user.
   */
  @Get('users/:userId/sessions')
  @RequirePermission('users', 'view')
  @ApiOperation({ summary: 'List active sessions for a user (admin)' })
  @ApiResponse({ status: 200, description: 'Sessions list' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  listSessions(@Param('userId') userId: string) {
    return this.mobileService.listSessions(userId);
  }
}
