import { pgTable, text, boolean, timestamp, integer } from "drizzle-orm/pg-core";

/**
 * Mobile application version configuration.
 * Stores version details, update policies, and release notes for mobile platforms (Android).
 */
export const mobileVersion = pgTable("mobile_version", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  platform: text("platform").notNull().default("android"),
  latestVersion: text("latest_version").notNull(),
  minimumVersion: text("minimum_version").notNull(),
  forceUpdate: boolean("force_update").notNull().default(false),
  updateUrl: text("update_url").notNull().default(""),
  downloadUrl: text("download_url").notNull().default(""),
  checksum: text("checksum").notNull().default(""),
  fileSize: integer("file_size").notNull().default(0),
  releaseNotes: text("release_notes").notNull().default(""),
  updateType: text("update_type").notNull().default("apk"),
  channel: text("channel").notNull().default("production"),
  runtimeVersion: text("runtime_version").notNull().default("1.0.0"),
  publishedAt: timestamp("published_at").defaultNow(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => /* @__PURE__ */ new Date())
    .notNull(),
});


