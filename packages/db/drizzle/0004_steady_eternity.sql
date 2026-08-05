CREATE TABLE "mobile_version" (
	"id" text PRIMARY KEY NOT NULL,
	"platform" text DEFAULT 'android' NOT NULL,
	"latest_version" text NOT NULL,
	"minimum_version" text NOT NULL,
	"force_update" boolean DEFAULT false NOT NULL,
	"update_url" text DEFAULT '' NOT NULL,
	"release_notes" text DEFAULT '' NOT NULL,
	"published_at" timestamp DEFAULT now(),
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
