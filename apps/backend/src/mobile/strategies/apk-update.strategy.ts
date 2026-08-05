import { Injectable } from '@nestjs/common';
import type { MobileVersionResponse } from '@repo/db';
import type {
  HybridUpdateResult,
  IUpdateStrategy,
} from './update-strategy.interface';

@Injectable()
export class ApkUpdateStrategyService implements IUpdateStrategy {
  /**
   * Constructs the payload for Android APK standalone updates.
   */
  buildPayload(
    dbVersion: MobileVersionResponse,
    updateAvailable: boolean,
    forceUpdate: boolean,
    clientChannel?: string,
    clientRuntimeVersion?: string,
  ): HybridUpdateResult {
    const downloadUrl =
      dbVersion.downloadUrl ||
      process.env.MOBILE_APK_DOWNLOAD_URL ||
      dbVersion.updateUrl ||
      '';

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

    return {
      updateAvailable,
      updateType: updateAvailable ? 'apk' : 'none',
      forceUpdate,
      minimumVersion: dbVersion.minimumVersion,
      latestVersion: dbVersion.latestVersion,
      releaseNotes: dbVersion.releaseNotes,
      version: dbVersion.latestVersion,
      downloadUrl,
      checksum: dbVersion.checksum,
      fileSize: dbVersion.fileSize,
      // Include OTA fields as fallbacks
      channel,
      runtimeVersion,
      // Backward compatibility fields
      updateUrl: dbVersion.updateUrl || downloadUrl,
      publishedAt: dbVersion.publishedAt,
      isActive: dbVersion.isActive,
    };
  }
}
