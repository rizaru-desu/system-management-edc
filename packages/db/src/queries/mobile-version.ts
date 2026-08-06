import { and, desc, eq, ilike, or, sql } from "drizzle-orm";
import { db } from "../client.js";
import { mobileVersion } from "../schema/mobile-version.js";

export interface MobileVersionRecord {
  id: string;
  platform: string;
  latestVersion: string;
  versionCode: number;
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
  versionCode?: number;
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
  publishedAt?: Date | null;
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
        versionCode: input.versionCode ?? 0,
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

// ── Admin release management (console APK / OTA module) ─────────────────────

/** A release row plus the per-platform "newest version" marker. */
export interface MobileVersionAdminRow extends MobileVersionRecord {
  /** True when this row carries the highest version for its platform. */
  isLatest: boolean;
}

export interface ListMobileVersionsOptions {
  /** Case-insensitive substring match on version names or release notes. */
  search?: string;
  platform?: string;
  updateType?: "apk" | "ota";
  isActive?: boolean;
  /** 1-based page number; defaults to 1. */
  page?: number;
  /** Rows per page, clamped to 1–{@link MAX_PAGE_SIZE}; defaults to 50. */
  pageSize?: number;
}

export interface MobileVersionListPage {
  releases: MobileVersionAdminRow[];
  /** Rows matching the filters across all pages. */
  total: number;
}

const DEFAULT_PAGE_SIZE = 50;
const MAX_PAGE_SIZE = 100;

/** Escapes LIKE wildcards so they match literally. */
function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, "\\$&");
}

/**
 * Numeric segment-wise version comparison ("1.10.0" > "1.9.2"). Non-numeric
 * segments fall back to string comparison so malformed versions still sort
 * deterministically.
 */
function compareVersionNames(a: string, b: string): number {
  const partsA = a.split(".");
  const partsB = b.split(".");
  const length = Math.max(partsA.length, partsB.length);
  for (let index = 0; index < length; index++) {
    const rawA = partsA[index] ?? "0";
    const rawB = partsB[index] ?? "0";
    const numA = Number(rawA);
    const numB = Number(rawB);
    if (Number.isNaN(numA) || Number.isNaN(numB)) {
      const cmp = rawA.localeCompare(rawB);
      if (cmp !== 0) return cmp;
      continue;
    }
    if (numA !== numB) return numA - numB;
  }
  return 0;
}

/**
 * The id of the highest-version release per platform (version name first,
 * then version code as tie-breaker) — the table's "Latest" indicator. The
 * release catalogue stays small, so the scan happens over a slim projection.
 */
async function latestReleaseIdsByPlatform(): Promise<Map<string, string>> {
  const rows = await db
    .select({
      id: mobileVersion.id,
      platform: mobileVersion.platform,
      latestVersion: mobileVersion.latestVersion,
      versionCode: mobileVersion.versionCode,
    })
    .from(mobileVersion);

  const latest = new Map<string, (typeof rows)[number]>();
  for (const row of rows) {
    const current = latest.get(row.platform);
    if (
      !current ||
      compareVersionNames(row.latestVersion, current.latestVersion) > 0 ||
      (compareVersionNames(row.latestVersion, current.latestVersion) === 0 &&
        row.versionCode > current.versionCode)
    ) {
      latest.set(row.platform, row);
    }
  }
  return new Map([...latest].map(([platform, row]) => [platform, row.id]));
}

/** WHERE clause for the admin list filters. */
function listConditions(options: ListMobileVersionsOptions) {
  const conditions = [];

  const term = options.search?.trim();
  if (term) {
    const pattern = `%${escapeLike(term)}%`;
    conditions.push(
      or(
        ilike(mobileVersion.latestVersion, pattern),
        ilike(mobileVersion.minimumVersion, pattern),
        ilike(mobileVersion.releaseNotes, pattern),
      ),
    );
  }
  if (options.platform) {
    conditions.push(eq(mobileVersion.platform, options.platform));
  }
  if (options.updateType) {
    conditions.push(eq(mobileVersion.updateType, options.updateType));
  }
  if (options.isActive !== undefined) {
    conditions.push(eq(mobileVersion.isActive, options.isActive));
  }

  return conditions.length > 0 ? and(...conditions) : undefined;
}

/**
 * Lists one page of mobile releases with optional search/platform/type/status
 * filters plus the total matching count, newest first. Follows the
 * `listServicePoints` pattern so consumers never mix drizzle-orm instances.
 */
export async function listMobileVersions(
  options: ListMobileVersionsOptions = {},
): Promise<MobileVersionListPage> {
  const where = listConditions(options);
  const pageSize = Math.min(
    Math.max(1, Math.trunc(options.pageSize ?? DEFAULT_PAGE_SIZE)),
    MAX_PAGE_SIZE,
  );
  const page = Math.max(1, Math.trunc(options.page ?? 1));

  const [rows, [countRow], latestIds] = await Promise.all([
    db
      .select()
      .from(mobileVersion)
      .where(where)
      .orderBy(desc(mobileVersion.createdAt))
      .limit(pageSize)
      .offset((page - 1) * pageSize),
    db
      .select({ total: sql<number>`count(*)`.mapWith(Number) })
      .from(mobileVersion)
      .where(where),
    latestReleaseIdsByPlatform(),
  ]);

  return {
    releases: rows.map((row) => ({
      ...row,
      isLatest: latestIds.get(row.platform) === row.id,
    })),
    total: countRow?.total ?? 0,
  };
}

/** A single release with its "Latest" marker; null when unknown. */
export async function findMobileVersionById(
  id: string,
): Promise<MobileVersionAdminRow | null> {
  const [row] = await db
    .select()
    .from(mobileVersion)
    .where(eq(mobileVersion.id, id));
  if (!row) return null;

  const latestIds = await latestReleaseIdsByPlatform();
  return { ...row, isLatest: latestIds.get(row.platform) === row.id };
}

export type UpdateMobileVersionInput = Partial<CreateMobileVersionInput>;

export type UpdateMobileVersionResult =
  | { ok: true; release: MobileVersionRecord }
  | { ok: false; error: "not-found" };

/**
 * Updates a release. When the update activates the row (or re-platforms an
 * active row), every other record on that platform is deactivated inside the
 * same transaction — the mobile check-update endpoint reads exactly one
 * active release per platform.
 */
export async function updateMobileVersion(
  id: string,
  input: UpdateMobileVersionInput,
): Promise<UpdateMobileVersionResult> {
  return db.transaction(async (tx) => {
    const [existing] = await tx
      .select()
      .from(mobileVersion)
      .where(eq(mobileVersion.id, id));
    if (!existing) return { ok: false as const, error: "not-found" as const };

    const platform = input.platform ?? existing.platform;
    const isActive = input.isActive ?? existing.isActive;

    if (isActive) {
      await tx
        .update(mobileVersion)
        .set({ isActive: false })
        .where(eq(mobileVersion.platform, platform));
    }

    const [updated] = await tx
      .update(mobileVersion)
      .set({ ...input, isActive })
      .where(eq(mobileVersion.id, id))
      .returning();
    if (!updated) return { ok: false as const, error: "not-found" as const };
    return { ok: true as const, release: updated };
  });
}

export type SetMobileVersionActiveResult =
  | { ok: true; release: MobileVersionRecord }
  | { ok: false; error: "not-found" };

/**
 * Publishes (activates) or unpublishes a release. Publishing deactivates the
 * platform's current live release and stamps `publishedAt` when it was never
 * set, so the check-update endpoint switches over atomically.
 */
export async function setMobileVersionActive(
  id: string,
  isActive: boolean,
): Promise<SetMobileVersionActiveResult> {
  return db.transaction(async (tx) => {
    const [existing] = await tx
      .select()
      .from(mobileVersion)
      .where(eq(mobileVersion.id, id));
    if (!existing) return { ok: false as const, error: "not-found" as const };

    if (isActive) {
      await tx
        .update(mobileVersion)
        .set({ isActive: false })
        .where(eq(mobileVersion.platform, existing.platform));
    }

    const [updated] = await tx
      .update(mobileVersion)
      .set({
        isActive,
        publishedAt:
          isActive && existing.publishedAt === null
            ? /* @__PURE__ */ new Date()
            : existing.publishedAt,
      })
      .where(eq(mobileVersion.id, id))
      .returning();
    if (!updated) return { ok: false as const, error: "not-found" as const };
    return { ok: true as const, release: updated };
  });
}

export type DeleteMobileVersionResult =
  | { ok: true }
  | { ok: false; error: "not-found" };

/** Hard-deletes a release record (the table has no soft-delete column). */
export async function deleteMobileVersion(
  id: string,
): Promise<DeleteMobileVersionResult> {
  const [deleted] = await db
    .delete(mobileVersion)
    .where(eq(mobileVersion.id, id))
    .returning({ id: mobileVersion.id });
  return deleted
    ? { ok: true as const }
    : { ok: false as const, error: "not-found" as const };
}
