import { BackHandler, Platform } from 'react-native';
import * as Linking from 'expo-linking';
import Constants from 'expo-constants';
import * as FileSystem from 'expo-file-system/legacy';
import * as Updates from 'expo-updates';
import * as IntentLauncher from 'expo-intent-launcher';
import { API_ENDPOINTS } from '@/config/api';
import { apiClient } from '@/services/api-client';

export type UpdateType = 'ota' | 'apk' | 'none';

export interface MobileVersionResponse {
  updateAvailable: boolean;
  updateType: UpdateType;
  forceUpdate: boolean;
  minimumVersion: string;
  latestVersion: string;
  releaseNotes: string;
  channel?: string;
  runtimeVersion?: string;
  version?: string;
  downloadUrl: string;
  updateUrl: string;
  checksum: string;
  fileSize: number;
  publishedAt: string;
  isActive: boolean;
}

export interface DownloadProgress {
  totalBytes: number;
  downloadedBytes: number;
  percent: number;
}

export interface UpdateActionResult {
  success: boolean;
  error?: string;
}

class UpdateService {
  /**
   * Current app version from Expo config
   */
  public getCurrentVersion(): string {
    return Constants.expoConfig?.version ?? '1.0.0';
  }

  /**
   * Current runtime version from Expo config
   */
  public getRuntimeVersion(): string {
    const runtime = Constants.expoConfig?.runtimeVersion;
    if (typeof runtime === 'string') return runtime;
    if (typeof runtime === 'object' && runtime && 'policy' in runtime) {
      return (runtime as { policy: string }).policy;
    }
    return this.getCurrentVersion();
  }

  /**
   * Current OTA channel or default 'production'
   */
  public getChannel(): string {
    return (Constants.expoConfig?.extra?.eas?.channel as string) || 'production';
  }

  /**
   * Check for updates from the backend Hybrid Update API.
   * Handles all network / parsing errors gracefully and returns null on failure so login is never blocked.
   */
  public async checkForUpdate(): Promise<MobileVersionResponse | null> {
    if (Platform.OS !== 'android') {
      return null;
    }

    try {
      const currentVersion = this.getCurrentVersion();
      const runtimeVersion = this.getRuntimeVersion();
      const channel = this.getChannel();

      const response = await apiClient.get<MobileVersionResponse>(API_ENDPOINTS.CHECK_UPDATE, {
        params: {
          currentVersion,
          platform: 'android',
          runtimeVersion,
          channel,
        },
        timeout: 6000,
      });

      return response.data;
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      console.warn('[UpdateService] Update check failed gracefully:', msg);
      return null;
    }
  }

  /**
   * Perform OTA update using expo-updates and reload app.
   */
  public async applyOtaUpdate(
    onStatusChange?: (status: string) => void,
  ): Promise<UpdateActionResult> {
    try {
      onStatusChange?.('Checking for OTA update package...');

      if (!Updates.isEnabled) {
        console.log('[UpdateService] expo-updates is disabled or in development mode.');
        onStatusChange?.('Update complete (Dev Mode)');
        return { success: true };
      }

      onStatusChange?.('Downloading OTA update...');
      const checkResult = await Updates.checkForUpdateAsync();

      if (checkResult.isAvailable) {
        onStatusChange?.('Installing OTA update...');
        const fetchResult = await Updates.fetchUpdateAsync();
        if (fetchResult.isNew) {
          onStatusChange?.('Restarting application...');
          await Updates.reloadAsync();
          return { success: true };
        }
      }

      // If already on latest bundle
      return { success: true };
    } catch (error: unknown) {
      console.error('[UpdateService] OTA update failed:', error);
      const msg = error instanceof Error ? error.message : 'Failed to download OTA update.';
      return {
        success: false,
        error: msg,
      };
    }
  }

  /**
   * Download APK file with progress tracking and launch Android installer automatically.
   */
  public async downloadAndInstallApk(
    downloadUrl: string,
    onProgress?: (progress: DownloadProgress) => void,
    onStatusChange?: (status: string) => void,
  ): Promise<UpdateActionResult> {
    if (!downloadUrl) {
      return { success: false, error: 'Missing download URL for APK update.' };
    }

    try {
      onStatusChange?.('Preparing download...');
      const cacheDir = FileSystem.cacheDirectory || FileSystem.documentDirectory;
      const targetFileUri = `${cacheDir}app-update.apk`;

      // Clean up previous APK file if exists
      const fileInfo = await FileSystem.getInfoAsync(targetFileUri);
      if (fileInfo.exists) {
        await FileSystem.deleteAsync(targetFileUri, { idempotent: true });
      }

      onStatusChange?.('Downloading APK...');

      const downloadResumable = FileSystem.createDownloadResumable(
        downloadUrl,
        targetFileUri,
        {},
        (downloadProgress) => {
          const totalBytes = downloadProgress.totalBytesExpectedToWrite;
          const downloadedBytes = downloadProgress.totalBytesWritten;
          const percent = totalBytes > 0 ? Math.min(100, Math.round((downloadedBytes / totalBytes) * 100)) : 0;

          onProgress?.({
            totalBytes,
            downloadedBytes,
            percent,
          });
        },
      );

      const result = await downloadResumable.downloadAsync();
      if (!result || !result.uri) {
        throw new Error('Download failed: No file URI returned.');
      }

      onStatusChange?.('Launching installer...');

      // Convert file URI to Android Content URI
      const contentUri = await FileSystem.getContentUriAsync(result.uri);

      // Try using expo-intent-launcher
      let intentLaunched = false;
      try {
        if (IntentLauncher && IntentLauncher.startActivityAsync) {
          await IntentLauncher.startActivityAsync('android.intent.action.VIEW', {
            data: contentUri,
            flags: 1, // FLAG_GRANT_READ_URI_PERMISSION
            type: 'application/vnd.android.package-archive',
          });
          intentLaunched = true;
        }
      } catch (intentErr) {
        console.warn('[UpdateService] Intent launcher fallback:', intentErr);
      }

      // Fallback via Linking.openURL
      if (!intentLaunched) {
        try {
          const canOpen = await Linking.canOpenURL(contentUri);
          if (canOpen) {
            await Linking.openURL(contentUri);
          } else {
            await Linking.openURL(downloadUrl);
          }
        } catch {
          await Linking.openURL(downloadUrl);
        }
      }

      return { success: true };
    } catch (error: unknown) {
      console.error('[UpdateService] APK download/install error:', error);
      const msg = error instanceof Error ? error.message : 'Failed to download or install the APK update.';
      return {
        success: false,
        error: msg,
      };
    }
  }

  /**
   * Close the application (for mandatory force updates)
   */
  public exitApp(): void {
    BackHandler.exitApp();
  }

  /**
   * Helper to format bytes into readable string (e.g. 14.5 MB)
   */
  public formatFileSize(bytes: number): string {
    if (!bytes || bytes <= 0) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
}

export const updateService = new UpdateService();
export default updateService;
