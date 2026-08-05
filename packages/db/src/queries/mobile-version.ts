import { eq, and } from "drizzle-orm";
import { db } from "../client.js";
import { mobileVersion } from "../schema/mobile-version.js";

export interface MobileVersionRecord {
  id: string;
  platform: string;
  latestVersion: string;
  minimumVersion: string;
  forceUpdate: boolean;
  updateUrl: string;
  downloadUrl: string;
  checksum: string;
  fileSize: number;
  releaseNotes: string;
  updateType: string;
  channel: string;
  runtimeVersion: string;
  publishedAt: Date | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface MobileVersionResponse {
  latestVersion: string;
  minimumVersion: string;
  forceUpdate: boolean;
  downloadUrl: string;
  updateUrl: string;
  releaseNotes: string;
  checksum: string;
  fileSize: number;
  updateType: 'ota' | 'apk';
  channel: string;
  runtimeVersion: string;
  publishedAt: string;
  isActive: boolean;
}

/**
 * Retrieves the currently active mobile version record for a platform (default 'android').
 */
export async function getActiveMobileVersion(
  platform: string = "android",
): Promise<MobileVersionResponse | null> {
  const records = await db
    .select({
      latestVersion: mobileVersion.latestVersion,
      minimumVersion: mobileVersion.minimumVersion,
      forceUpdate: mobileVersion.forceUpdate,
      updateUrl: mobileVersion.updateUrl,
      downloadUrl: mobileVersion.downloadUrl,
      checksum: mobileVersion.checksum,
      fileSize: mobileVersion.fileSize,
      releaseNotes: mobileVersion.releaseNotes,
      updateType: mobileVersion.updateType,
      channel: mobileVersion.channel,
      runtimeVersion: mobileVersion.runtimeVersion,
      publishedAt: mobileVersion.publishedAt,
      isActive: mobileVersion.isActive,
    })
    .from(mobileVersion)
    .where(
      and(
        eq(mobileVersion.platform, platform),
        eq(mobileVersion.isActive, true),
      ),
    )
    .limit(1);

  const record = records[0];
  if (!record) {
    return null;
  }

  const rawDownloadUrl = record.downloadUrl ?? "";
  const rawUpdateUrl = record.updateUrl ?? "";
  const resolvedDownloadUrl = rawDownloadUrl || rawUpdateUrl;
  const resolvedUpdateUrl = rawUpdateUrl || rawDownloadUrl;

  const rawUpdateType = (record.updateType as 'ota' | 'apk') || 'apk';

  return {
    latestVersion: record.latestVersion,
    minimumVersion: record.minimumVersion,
    forceUpdate: record.forceUpdate,
    downloadUrl: resolvedDownloadUrl,
    updateUrl: resolvedUpdateUrl,
    releaseNotes: record.releaseNotes ?? "",
    checksum: record.checksum ?? "",
    fileSize: record.fileSize ?? 0,
    updateType: rawUpdateType === 'ota' ? 'ota' : 'apk',
    channel: record.channel ?? "production",
    runtimeVersion: record.runtimeVersion ?? "1.0.0",
    publishedAt: record.publishedAt ? record.publishedAt.toISOString() : "",
    isActive: record.isActive,
  };
}

export interface CreateMobileVersionInput {
  platform?: string;
  latestVersion: string;
  minimumVersion: string;
  forceUpdate?: boolean;
  updateUrl?: string;
  downloadUrl?: string;
  checksum?: string;
  fileSize?: number;
  releaseNotes?: string;
  updateType?: 'ota' | 'apk';
  channel?: string;
  runtimeVersion?: string;
  publishedAt?: Date;
  isActive?: boolean;
}

/**
 * Creates or inserts a mobile version record. If isActive is true,
 * deactivates all other records for the specified platform first (ensuring only one active version).
 */
export async function createMobileVersion(
  input: CreateMobileVersionInput,
): Promise<MobileVersionRecord> {
  const platform = input.platform ?? "android";
  const isActive = input.isActive ?? true;

  const downloadUrl = input.downloadUrl ?? input.updateUrl ?? "";
  const updateUrl = input.updateUrl ?? input.downloadUrl ?? "";

  return await db.transaction(async (tx) => {
    if (isActive) {
      await tx
        .update(mobileVersion)
        .set({ isActive: false })
        .where(eq(mobileVersion.platform, platform));
    }

    const inserted = await tx
      .insert(mobileVersion)
      .values({
        platform,
        latestVersion: input.latestVersion,
        minimumVersion: input.minimumVersion,
        forceUpdate: input.forceUpdate ?? false,
        updateUrl,
        downloadUrl,
        checksum: input.checksum ?? "",
        fileSize: input.fileSize ?? 0,
        releaseNotes: input.releaseNotes ?? "",
        updateType: input.updateType ?? "apk",
        channel: input.channel ?? "production",
        runtimeVersion: input.runtimeVersion ?? "1.0.0",
        publishedAt: input.publishedAt ?? new Date(),
        isActive,
      })
      .returning();

    const record = inserted[0];
    if (!record) {
      throw new Error("Failed to insert mobile version record");
    }
    return record;
  });
}
