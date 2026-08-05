import { relations } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { user } from "./auth.js";

/**
 * mobile_devices
 * Stores unique device registration per user (userId + deviceId).
 * Upserted upon login to record latest status and device telemetry.
 */
export const mobileDevices = pgTable(
  "mobile_devices",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    deviceId: text("device_id").notNull(),
    platform: text("platform").notNull().default("android"),
    brand: text("brand"),
    manufacturer: text("manufacturer"),
    model: text("model"),
    androidVersion: text("android_version"),
    sdkVersion: text("sdk_version"),
    appVersion: text("app_version"),
    buildNumber: text("build_number"),
    carrier: text("carrier"),
    networkType: text("network_type"),
    isRooted: boolean("is_rooted").notNull().default(false),
    isDeveloperMode: boolean("is_developer_mode").notNull().default(false),
    isEmulator: boolean("is_emulator").notNull().default(false),
    fcmToken: text("fcm_token"),
    status: text("status").notNull().default("ACTIVE"),
    loginCount: integer("login_count").notNull().default(1),
    lastLoginAt: timestamp("last_login_at").defaultNow(),
    lastLogoutAt: timestamp("last_logout_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    uniqueIndex("mobile_devices_user_device_idx").on(
      table.userId,
      table.deviceId,
    ),
    index("mobile_devices_device_id_idx").on(table.deviceId),
    index("mobile_devices_user_id_idx").on(table.userId),
  ],
);

/**
 * mobile_login_history
 * Records every successful mobile login event with device telemetry and network info.
 */
export const mobileLoginHistory = pgTable(
  "mobile_login_history",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    deviceId: text("device_id").notNull(),
    platform: text("platform").default("android"),
    brand: text("brand"),
    manufacturer: text("manufacturer"),
    model: text("model"),
    androidVersion: text("android_version"),
    sdkVersion: text("sdk_version"),
    appVersion: text("app_version"),
    buildNumber: text("build_number"),
    carrier: text("carrier"),
    networkType: text("network_type"),
    isRooted: boolean("is_rooted").default(false),
    isDeveloperMode: boolean("is_developer_mode").default(false),
    isEmulator: boolean("is_emulator").default(false),
    fcmToken: text("fcm_token"),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    loginAt: timestamp("login_at").defaultNow().notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("mobile_login_history_user_id_idx").on(table.userId),
    index("mobile_login_history_device_id_idx").on(table.deviceId),
    index("mobile_login_history_login_at_idx").on(table.loginAt),
  ],
);

/**
 * mobile_logout_history
 * Records every mobile logout event.
 */
export const mobileLogoutHistory = pgTable(
  "mobile_logout_history",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    deviceId: text("device_id").notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    logoutAt: timestamp("logout_at").defaultNow().notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("mobile_logout_history_user_id_idx").on(table.userId),
    index("mobile_logout_history_device_id_idx").on(table.deviceId),
  ],
);

export const mobileDevicesRelations = relations(mobileDevices, ({ one }) => ({
  user: one(user, {
    fields: [mobileDevices.userId],
    references: [user.id],
  }),
}));

export const mobileLoginHistoryRelations = relations(
  mobileLoginHistory,
  ({ one }) => ({
    user: one(user, {
      fields: [mobileLoginHistory.userId],
      references: [user.id],
    }),
  }),
);

export const mobileLogoutHistoryRelations = relations(
  mobileLogoutHistory,
  ({ one }) => ({
    user: one(user, {
      fields: [mobileLogoutHistory.userId],
      references: [user.id],
    }),
  }),
);
