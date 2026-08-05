import { and, desc, eq, sql } from "drizzle-orm";
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
