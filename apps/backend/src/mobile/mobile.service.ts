import { Injectable, NotFoundException } from '@nestjs/common';
import {
  getActiveMobileVersion,
  listUserDevices,
  listUserLoginHistoryPage,
  listUserSessions,
  logoutMobileDevice,
  registerOrUpdateMobileDevice,
} from '@repo/db';
import { CheckUpdateQueryDto } from './dto/check-update-query.dto';
import { LoginHistoryQueryDto } from './dto/login-history-query.dto';
import { LogoutDeviceDto } from './dto/logout-device.dto';
import type { MobileVersionResponseDto } from './dto/mobile-version-response.dto';
import { RegisterDeviceDto } from './dto/register-device.dto';
import { ApkUpdateStrategyService } from './strategies/apk-update.strategy';
import { OtaUpdateStrategyService } from './strategies/ota-update.strategy';
import type { UpdateType } from './strategies/update-strategy.interface';
import { compareVersions } from './utils/version-comparator.util';

@Injectable()
export class MobileService {
  constructor(
    private readonly otaStrategy: OtaUpdateStrategyService,
    private readonly apkStrategy: ApkUpdateStrategyService,
  ) {}

  /**
   * Evaluates update requirement for a mobile client and delegates payload construction
   * to the appropriate update strategy service (OTA or APK).
   */
  async checkUpdate(
    query?: CheckUpdateQueryDto,
  ): Promise<MobileVersionResponseDto> {
    const platform = query?.platform || 'android';
    const dbVersion = await getActiveMobileVersion(platform);

    if (!dbVersion) {
      throw new NotFoundException(
        `No active mobile version found for ${platform}`,
      );
    }

    const clientVersion = query?.currentVersion;

    let updateAvailable = false;
    let forceUpdate = false;
    let selectedType: UpdateType = dbVersion.updateType || 'apk';

    if (!clientVersion) {
      // Legacy client calling without currentVersion
      updateAvailable = true;
      forceUpdate = dbVersion.forceUpdate;
    } else {
      const cmpLatest = compareVersions(clientVersion, dbVersion.latestVersion);
      const cmpMinimum = compareVersions(
        clientVersion,
        dbVersion.minimumVersion,
      );

      if (cmpMinimum < 0) {
        // Installed version is below minimum supported -> mandatory force update
        updateAvailable = true;
        forceUpdate = true;
        selectedType = dbVersion.updateType || 'apk';
      } else if (cmpLatest < 0) {
        // Installed version is behind latest -> update available
        updateAvailable = true;
        forceUpdate = dbVersion.forceUpdate;
        selectedType = dbVersion.updateType || 'ota';
      } else {
        // App is on or above latest version -> no update needed
        updateAvailable = false;
        forceUpdate = false;
        selectedType = 'none';
      }
    }

    if (selectedType === 'ota') {
      return this.otaStrategy.buildPayload(
        dbVersion,
        updateAvailable,
        forceUpdate,
        query?.channel,
        query?.runtimeVersion,
      ) as MobileVersionResponseDto;
    }

    return this.apkStrategy.buildPayload(
      dbVersion,
      updateAvailable,
      forceUpdate,
      query?.channel,
      query?.runtimeVersion,
    ) as MobileVersionResponseDto;
  }

  /**
   * Retained for backward compatibility.
   */
  async getLatestAndroidVersion(): Promise<MobileVersionResponseDto> {
    return this.checkUpdate({ platform: 'android' });
  }

  /**
   * Upserts the mobile device telemetry, increments login count, marks device ACTIVE,
   * and records an entry in mobile_login_history.
   */
  async registerDevice(
    userId: string,
    dto: RegisterDeviceDto,
    meta?: { ipAddress?: string; userAgent?: string },
  ) {
    const result = await registerOrUpdateMobileDevice({
      userId,
      ...dto,
      ipAddress: meta?.ipAddress,
      userAgent: meta?.userAgent,
    });

    return {
      success: true,
      message: 'Device registered successfully',
      data: {
        deviceId: result.deviceId,
        status: result.status,
        loginCount: result.loginCount,
        lastLoginAt: result.lastLoginAt.toISOString(),
      },
    };
  }

  /**
   * Deactivates the mobile device, sets lastLogoutAt, and records an entry in mobile_logout_history.
   */
  async logoutDevice(
    userId: string,
    dto: LogoutDeviceDto,
    meta?: { ipAddress?: string; userAgent?: string },
  ) {
    const result = await logoutMobileDevice({
      userId,
      deviceId: dto.deviceId,
      ipAddress: meta?.ipAddress,
      userAgent: meta?.userAgent,
    });

    return {
      success: true,
      message: 'Device logged out successfully',
      data: {
        deviceId: result.deviceId,
        status: result.status,
        lastLogoutAt: result.lastLogoutAt.toISOString(),
      },
    };
  }
  /**
   * Lists all registered mobile devices for a user (admin use).
   */
  async listDevices(userId: string) {
    const devices = await listUserDevices(userId);
    return { success: true, data: devices };
  }

  /**
   * Lists the mobile login history for a user (admin use), newest first, with
   * server-side pagination and filtering. Without query params it returns the
   * same rows as before pagination existed (first 50 login events); `data`
   * remains as a legacy alias of `items` for pre-pagination consumers.
   */
  async listLoginHistory(userId: string, query?: LoginHistoryQueryDto) {
    const page = query?.page ?? 1;
    const limit = query?.limit ?? 50;
    const { items, total } = await listUserLoginHistoryPage(userId, {
      page,
      limit,
      search: query?.search,
      from: query?.from,
      to: query?.to,
      eventType: query?.eventType,
      status: query?.status,
      deviceId: query?.deviceId,
    });
    return {
      success: true,
      data: items,
      items,
      total,
      page,
      limit,
      hasNext: page * limit < total,
    };
  }

  /**
   * Lists active sessions for a user (admin use).
   */
  async listSessions(userId: string) {
    const sessions = await listUserSessions(userId);
    return { success: true, data: sessions };
  }
}
