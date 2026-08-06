export type AppReleasePlatform = 'android' | 'ios'
export type AppReleaseUpdateType = 'apk' | 'ota'

/**
 * One mobile app release in the shape the console consumes. Backed by the
 * `mobile_version` table — `versionName`/`changelog` are the console-facing
 * names of its `latestVersion`/`releaseNotes` columns.
 */
export interface AppReleaseRecord {
  id: string
  platform: AppReleasePlatform
  updateType: AppReleaseUpdateType
  /** Human version, e.g. "1.4.0". */
  versionName: string
  /** Monotonic build number (Android versionCode). */
  versionCode: number
  /** Oldest version still allowed to run; older clients are force-updated. */
  minimumVersion: string
  downloadUrl: string
  changelog: string
  /** Bytes; 0 when unknown. */
  fileSize: number
  checksum: string
  forceUpdate: boolean
  /** The release the mobile check-update endpoint currently serves. */
  isActive: boolean
  /** Highest version for its platform (the table's "Latest" chip). */
  isLatest: boolean
  /** OTA release channel, e.g. "production". */
  channel: string
  /** Expo runtime version an OTA bundle is compatible with. */
  runtimeVersion: string
  /** ISO timestamp; null while the release was never published. */
  publishedAt: string | null
  createdAt: string
  updatedAt: string
}

export const PLATFORM_LABELS: Record<AppReleasePlatform, string> = {
  android: 'Android',
  ios: 'iOS',
}

export const UPDATE_TYPE_LABELS: Record<AppReleaseUpdateType, string> = {
  apk: 'APK',
  ota: 'OTA',
}

/** "12.4 MB"-style label; em dash when the size was never recorded. */
export function formatFileSize(bytes: number): string {
  if (!bytes || bytes <= 0) return '—'
  const units = ['B', 'KB', 'MB', 'GB']
  let value = bytes
  let unit = 0
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024
    unit++
  }
  return `${unit === 0 ? value : value.toFixed(1)} ${units[unit]}`
}

/** ISO timestamp → "2026-08-06 14:30" (UTC-stable so SSR and client match). */
export function formatDateTime(iso: string | null): string {
  if (!iso) return '—'
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toISOString().slice(0, 16).replace('T', ' ')
}
