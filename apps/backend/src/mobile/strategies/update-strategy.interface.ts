import type { MobileVersionResponse } from '@repo/db';

export type UpdateType = 'ota' | 'apk' | 'none';

export interface HybridUpdateResult {
  updateAvailable: boolean;
  updateType: UpdateType;
  forceUpdate: boolean;
  minimumVersion: string;
  latestVersion: string;
  releaseNotes: string;
  // OTA specific
  channel?: string;
  runtimeVersion?: string;
  // APK specific
  version?: string;
  downloadUrl?: string;
  checksum?: string;
  fileSize?: number;
  // Legacy / Backward compatibility fields
  updateUrl?: string;
  publishedAt?: string;
  isActive?: boolean;
}

export interface IUpdateStrategy {
  buildPayload(
    dbVersion: MobileVersionResponse,
    updateAvailable: boolean,
    forceUpdate: boolean,
    clientChannel?: string,
    clientRuntimeVersion?: string,
  ): HybridUpdateResult;
}
