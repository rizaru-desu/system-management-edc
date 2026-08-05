import { Injectable } from '@nestjs/common';
import type { MobileVersionResponse } from '@repo/db';
import type {
  HybridUpdateResult,
  IUpdateStrategy,
} from './update-strategy.interface';

@Injectable()
export class OtaUpdateStrategyService implements IUpdateStrategy {
  /**
   * Constructs the payload for Expo Over-The-Air (OTA) updates.
   */
  buildPayload(
    dbVersion: MobileVersionResponse,
    updateAvailable: boolean,
    forceUpdate: boolean,
    clientChannel?: string,
    clientRuntimeVersion?: string,
  ): HybridUpdateResult {
    const channel =
      clientChannel ||
      dbVersion.channel ||
      process.env.MOBILE_OTA_CHANNEL ||
      'production';

    const runtimeVersion =
      clientRuntimeVersion ||
      dbVersion.runtimeVersion ||
      process.env.MOBILE_OTA_RUNTIME_VERSION ||
      dbVersion.latestVersion;

    const downloadUrl =
      dbVersion.downloadUrl ||
      process.env.MOBILE_APK_DOWNLOAD_URL ||
      dbVersion.updateUrl ||
      '';

    return {
      updateAvailable,
      updateType: updateAvailable ? 'ota' : 'none',
      forceUpdate,
      minimumVersion: dbVersion.minimumVersion,
      latestVersion: dbVersion.latestVersion,
      releaseNotes: dbVersion.releaseNotes,
      channel,
      runtimeVersion,
      // Backward compatibility defaults
      version: dbVersion.latestVersion,
      downloadUrl,
      updateUrl: dbVersion.updateUrl || downloadUrl,
      checksum: dbVersion.checksum,
      fileSize: dbVersion.fileSize,
      publishedAt: dbVersion.publishedAt,
      isActive: dbVersion.isActive,
    };
  }
}
