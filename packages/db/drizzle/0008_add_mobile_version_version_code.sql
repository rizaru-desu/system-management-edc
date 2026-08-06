ALTER TABLE "mobile_version" ADD COLUMN "version_code" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
-- The service point tables predate this migration in every live database
-- (they were pushed outside the migration journal), but were never captured
-- in a snapshot. The guarded DDL below records them idempotently so a fresh
-- database gets them and an existing one is untouched.
CREATE TABLE IF NOT EXISTS "service_point_assignments" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"service_point_id" text NOT NULL,
	"role_at_service_point" text NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"status" text DEFAULT 'ACTIVE' NOT NULL,
	"assigned_at" timestamp DEFAULT now() NOT NULL,
	"unassigned_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "service_points" (
	"id" text PRIMARY KEY NOT NULL,
	"parent_id" text,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"region" text,
	"address" text,
	"phone" text,
	"email" text,
	"latitude" double precision,
	"longitude" double precision,
	"notes" text,
	"status" text DEFAULT 'ACTIVE' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp
);
--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "service_point_assignments" ADD CONSTRAINT "service_point_assignments_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "service_point_assignments" ADD CONSTRAINT "service_point_assignments_service_point_id_service_points_id_fk" FOREIGN KEY ("service_point_id") REFERENCES "public"."service_points"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "service_points" ADD CONSTRAINT "service_points_parent_id_service_points_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."service_points"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "service_point_assignments_user_sp_idx" ON "service_point_assignments" USING btree ("user_id","service_point_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "service_point_assignments_user_id_idx" ON "service_point_assignments" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "service_point_assignments_service_point_id_idx" ON "service_point_assignments" USING btree ("service_point_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "service_point_assignments_status_idx" ON "service_point_assignments" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "service_points_code_idx" ON "service_points" USING btree ("code") WHERE "service_points"."deleted_at" is null;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "service_points_parent_id_idx" ON "service_points" USING btree ("parent_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "service_points_status_idx" ON "service_points" USING btree ("status");
