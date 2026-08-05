import {
  and,
  desc,
  eq,
  exists,
  gte,
  ilike,
  lte,
  or,
  sql,
  type SQL,
} from "drizzle-orm";
import { db } from "../client.js";
import {
  mobileDevices,
  mobileLoginHistory,
  mobileLogoutHistory,
} from "../schema/mobile-device.js";
import { session } from "../schema/auth.js";

export interface RegisterDeviceInput {
  userId: string;
  deviceId: string;
  platform?: string;
  brand?: string;
  manufacturer?: string;
  model?: string;
  androidVersion?: string;
  sdkVersion?: string;
  appVersion?: string;
  buildNumber?: string;
  carrier?: string | null;
  networkType?: string;
  isRooted?: boolean;
  isDeveloperMode?: boolean;
  isEmulator?: boolean;
  fcmToken?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
}

export interface RegisterDeviceResult {
  deviceId: string;
  status: string;
  loginCount: number;
  lastLoginAt: Date;
}

export interface LogoutDeviceInput {
  userId: string;
  deviceId: string;
  ipAddress?: string | null;
  userAgent?: string | null;
}

export interface LogoutDeviceResult {
  deviceId: string;
  status: string;
  lastLogoutAt: Date;
}

/**
 * Registers or updates a device for a user upon login and records login history.
 * If the (userId + deviceId) row exists, updates the telemetry, increments loginCount,
 * sets status = 'ACTIVE', and sets lastLoginAt = now().
 */
export async function registerOrUpdateMobileDevice(
  input: RegisterDeviceInput,
): Promise<RegisterDeviceResult> {
  const now = new Date();
  const platform = input.platform ?? "android";
  const isRooted = input.isRooted ?? false;
  const isDeveloperMode = input.isDeveloperMode ?? false;
  const isEmulator = input.isEmulator ?? false;

  return await db.transaction(async (tx) => {
    const upserted = await tx
      .insert(mobileDevices)
      .values({
        userId: input.userId,
        deviceId: input.deviceId,
        platform,
        brand: input.brand,
        manufacturer: input.manufacturer,
        model: input.model,
        androidVersion: input.androidVersion,
        sdkVersion: input.sdkVersion,
        appVersion: input.appVersion,
        buildNumber: input.buildNumber,
        carrier: input.carrier,
        networkType: input.networkType,
        isRooted,
        isDeveloperMode,
        isEmulator,
        fcmToken: input.fcmToken,
        status: "ACTIVE",
        loginCount: 1,
        lastLoginAt: now,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: [mobileDevices.userId, mobileDevices.deviceId],
        set: {
          platform,
          brand: input.brand,
          manufacturer: input.manufacturer,
          model: input.model,
          androidVersion: input.androidVersion,
          sdkVersion: input.sdkVersion,
          appVersion: input.appVersion,
          buildNumber: input.buildNumber,
          carrier: input.carrier,
          networkType: input.networkType,
          isRooted,
          isDeveloperMode,
          isEmulator,
          fcmToken: input.fcmToken,
          status: "ACTIVE",
          loginCount: sql`${mobileDevices.loginCount} + 1`,
          lastLoginAt: now,
          updatedAt: now,
        },
      })
      .returning({
        deviceId: mobileDevices.deviceId,
        status: mobileDevices.status,
        loginCount: mobileDevices.loginCount,
        lastLoginAt: mobileDevices.lastLoginAt,
      });

    await tx.insert(mobileLoginHistory).values({
      userId: input.userId,
      deviceId: input.deviceId,
      platform,
      brand: input.brand,
      manufacturer: input.manufacturer,
      model: input.model,
      androidVersion: input.androidVersion,
      sdkVersion: input.sdkVersion,
      appVersion: input.appVersion,
      buildNumber: input.buildNumber,
      carrier: input.carrier,
      networkType: input.networkType,
      isRooted,
      isDeveloperMode,
      isEmulator,
      fcmToken: input.fcmToken,
      ipAddress: input.ipAddress ?? null,
      userAgent: input.userAgent ?? null,
      loginAt: now,
    });

    const record = upserted[0];
    return {
      deviceId: record?.deviceId ?? input.deviceId,
      status: record?.status ?? "ACTIVE",
      loginCount: record?.loginCount ?? 1,
      lastLoginAt: record?.lastLoginAt ?? now,
    };
  });
}

/**
 * Deactivates a device for a user upon logout and records logout history.
 * Sets status = 'INACTIVE' and lastLogoutAt = now().
 */
export async function logoutMobileDevice(
  input: LogoutDeviceInput,
): Promise<LogoutDeviceResult> {
  const now = new Date();

  return await db.transaction(async (tx) => {
    const updated = await tx
      .update(mobileDevices)
      .set({
        status: "INACTIVE",
        lastLogoutAt: now,
        updatedAt: now,
      })
      .where(
        and(
          eq(mobileDevices.userId, input.userId),
          eq(mobileDevices.deviceId, input.deviceId),
        ),
      )
      .returning({
        deviceId: mobileDevices.deviceId,
        status: mobileDevices.status,
        lastLogoutAt: mobileDevices.lastLogoutAt,
      });

    await tx.insert(mobileLogoutHistory).values({
      userId: input.userId,
      deviceId: input.deviceId,
      ipAddress: input.ipAddress ?? null,
      userAgent: input.userAgent ?? null,
      logoutAt: now,
    });

    const record = updated[0];
    return {
      deviceId: record?.deviceId ?? input.deviceId,
      status: record?.status ?? "INACTIVE",
      lastLogoutAt: record?.lastLogoutAt ?? now,
    };
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// List queries for the admin device management drawer
// ─────────────────────────────────────────────────────────────────────────────

export interface UserDeviceRecord {
  id: string;
  deviceId: string;
  platform: string;
  brand: string | null;
  manufacturer: string | null;
  model: string | null;
  androidVersion: string | null;
  sdkVersion: string | null;
  appVersion: string | null;
  buildNumber: string | null;
  carrier: string | null;
  networkType: string | null;
  isRooted: boolean;
  isDeveloperMode: boolean;
  isEmulator: boolean;
  fcmToken: string | null;
  status: string;
  loginCount: number;
  lastLoginAt: Date | null;
  lastLogoutAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserLoginHistoryRecord {
  id: string;
  deviceId: string;
  platform: string | null;
  brand: string | null;
  model: string | null;
  appVersion: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  loginAt: Date;
}

export interface UserSessionRecord {
  id: string;
  token: string;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: Date;
  expiresAt: Date;
}

/**
 * Lists all registered mobile devices for a user, ordered by last login descending.
 */
export async function listUserDevices(
  userId: string,
): Promise<UserDeviceRecord[]> {
  return await db
    .select()
    .from(mobileDevices)
    .where(eq(mobileDevices.userId, userId))
    .orderBy(desc(mobileDevices.lastLoginAt));
}

/**
 * Lists the most recent login history entries for a user, newest first.
 */
export async function listUserLoginHistory(
  userId: string,
  limit = 50,
): Promise<UserLoginHistoryRecord[]> {
  return await db
    .select({
      id: mobileLoginHistory.id,
      deviceId: mobileLoginHistory.deviceId,
      platform: mobileLoginHistory.platform,
      brand: mobileLoginHistory.brand,
      model: mobileLoginHistory.model,
      appVersion: mobileLoginHistory.appVersion,
      ipAddress: mobileLoginHistory.ipAddress,
      userAgent: mobileLoginHistory.userAgent,
      loginAt: mobileLoginHistory.loginAt,
    })
    .from(mobileLoginHistory)
    .where(eq(mobileLoginHistory.userId, userId))
    .orderBy(desc(mobileLoginHistory.loginAt))
    .limit(limit);
}

export interface ListUserLoginHistoryPageOptions {
  page?: number;
  limit?: number;
  /** Matches device name (brand/model), device ID, or IP address (case-insensitive). */
  search?: string;
  from?: Date;
  to?: Date;
  /** Which history stream to read; defaults to "login" (the pre-pagination behavior). */
  eventType?: "login" | "logout";
  /** Filters by the device's *current* status in mobile_devices (e.g. ACTIVE). */
  status?: string;
  deviceId?: string;
}

export interface UserLoginHistoryEventRecord extends UserLoginHistoryRecord {
  eventType: "login" | "logout";
}

export interface UserLoginHistoryPage {
  items: UserLoginHistoryEventRecord[];
  total: number;
}

/** Correlated EXISTS against the device registry's current status. */
function deviceStatusFilter(
  userIdColumn: typeof mobileLoginHistory.userId | typeof mobileLogoutHistory.userId,
  deviceIdColumn: typeof mobileLoginHistory.deviceId | typeof mobileLogoutHistory.deviceId,
  status: string,
): SQL {
  return exists(
    db
      .select({ one: sql`1` })
      .from(mobileDevices)
      .where(
        and(
          eq(mobileDevices.userId, userIdColumn),
          eq(mobileDevices.deviceId, deviceIdColumn),
          eq(mobileDevices.status, status),
        ),
      ),
  );
}

/**
 * Paginated, filterable variant of {@link listUserLoginHistory}, newest first.
 * Both the page of items and the filtered total are fetched in a single round
 * trip each (no per-row lookups); the device-status filter is a correlated
 * EXISTS rather than an N+1 fetch.
 */
export async function listUserLoginHistoryPage(
  userId: string,
  options: ListUserLoginHistoryPageOptions = {},
): Promise<UserLoginHistoryPage> {
  const page = Math.max(1, Math.trunc(options.page ?? 1));
  const limit = Math.max(1, Math.trunc(options.limit ?? 50));
  const offset = (page - 1) * limit;
  const eventType = options.eventType ?? "login";
  const pattern = options.search?.trim()
    ? `%${options.search.trim()}%`
    : undefined;

  if (eventType === "logout") {
    const conditions: SQL[] = [eq(mobileLogoutHistory.userId, userId)];
    if (options.deviceId) {
      conditions.push(eq(mobileLogoutHistory.deviceId, options.deviceId));
    }
    if (options.from) {
      conditions.push(gte(mobileLogoutHistory.logoutAt, options.from));
    }
    if (options.to) {
      conditions.push(lte(mobileLogoutHistory.logoutAt, options.to));
    }
    if (pattern) {
      // Logout events carry no device-name telemetry; match ID and IP only.
      const search = or(
        ilike(mobileLogoutHistory.deviceId, pattern),
        ilike(mobileLogoutHistory.ipAddress, pattern),
      );
      if (search) conditions.push(search);
    }
    if (options.status) {
      conditions.push(
        deviceStatusFilter(
          mobileLogoutHistory.userId,
          mobileLogoutHistory.deviceId,
          options.status,
        ),
      );
    }
    const where = and(...conditions);

    const [rows, totalRows] = await Promise.all([
      db
        .select({
          id: mobileLogoutHistory.id,
          deviceId: mobileLogoutHistory.deviceId,
          platform: sql<string | null>`null`,
          brand: sql<string | null>`null`,
          model: sql<string | null>`null`,
          appVersion: sql<string | null>`null`,
          ipAddress: mobileLogoutHistory.ipAddress,
          userAgent: mobileLogoutHistory.userAgent,
          loginAt: mobileLogoutHistory.logoutAt,
        })
        .from(mobileLogoutHistory)
        .where(where)
        .orderBy(desc(mobileLogoutHistory.logoutAt))
        .limit(limit)
        .offset(offset),
      db
        .select({ count: sql<number>`cast(count(*) as int)` })
        .from(mobileLogoutHistory)
        .where(where),
    ]);

    return {
      items: rows.map((row) => ({ ...row, eventType: "logout" as const })),
      total: totalRows[0]?.count ?? 0,
    };
  }

  const conditions: SQL[] = [eq(mobileLoginHistory.userId, userId)];
  if (options.deviceId) {
    conditions.push(eq(mobileLoginHistory.deviceId, options.deviceId));
  }
  if (options.from) {
    conditions.push(gte(mobileLoginHistory.loginAt, options.from));
  }
  if (options.to) {
    conditions.push(lte(mobileLoginHistory.loginAt, options.to));
  }
  if (pattern) {
    const search = or(
      ilike(mobileLoginHistory.brand, pattern),
      ilike(mobileLoginHistory.model, pattern),
      ilike(mobileLoginHistory.deviceId, pattern),
      ilike(mobileLoginHistory.ipAddress, pattern),
    );
    if (search) conditions.push(search);
  }
  if (options.status) {
    conditions.push(
      deviceStatusFilter(
        mobileLoginHistory.userId,
        mobileLoginHistory.deviceId,
        options.status,
      ),
    );
  }
  const where = and(...conditions);

  const [rows, totalRows] = await Promise.all([
    db
      .select({
        id: mobileLoginHistory.id,
        deviceId: mobileLoginHistory.deviceId,
        platform: mobileLoginHistory.platform,
        brand: mobileLoginHistory.brand,
        model: mobileLoginHistory.model,
        appVersion: mobileLoginHistory.appVersion,
        ipAddress: mobileLoginHistory.ipAddress,
        userAgent: mobileLoginHistory.userAgent,
        loginAt: mobileLoginHistory.loginAt,
      })
      .from(mobileLoginHistory)
      .where(where)
      .orderBy(desc(mobileLoginHistory.loginAt))
      .limit(limit)
      .offset(offset),
    db
      .select({ count: sql<number>`cast(count(*) as int)` })
      .from(mobileLoginHistory)
      .where(where),
  ]);

  return {
    items: rows.map((row) => ({ ...row, eventType: "login" as const })),
    total: totalRows[0]?.count ?? 0,
  };
}

/**
 * Lists active (non-expired) sessions for a user, newest first.
 */
export async function listUserSessions(
  userId: string,
): Promise<UserSessionRecord[]> {
  const now = new Date();
  return await db
    .select({
      id: session.id,
      token: session.token,
      ipAddress: session.ipAddress,
      userAgent: session.userAgent,
      createdAt: session.createdAt,
      expiresAt: session.expiresAt,
    })
    .from(session)
    .where(
      and(
        eq(session.userId, userId),
        sql`${session.expiresAt} > ${now}`,
      ),
    )
    .orderBy(desc(session.createdAt));
}
