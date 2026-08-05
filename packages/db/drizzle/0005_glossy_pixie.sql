ALTER TABLE "mobile_version" ADD COLUMN "download_url" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "mobile_version" ADD COLUMN "checksum" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "mobile_version" ADD COLUMN "file_size" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "mobile_version" ADD COLUMN "update_type" text DEFAULT 'apk' NOT NULL;--> statement-breakpoint
ALTER TABLE "mobile_version" ADD COLUMN "channel" text DEFAULT 'production' NOT NULL;--> statement-breakpoint
ALTER TABLE "mobile_version" ADD COLUMN "runtime_version" text DEFAULT '1.0.0' NOT NULL;