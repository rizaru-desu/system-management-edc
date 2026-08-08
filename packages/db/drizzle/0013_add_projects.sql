CREATE TABLE "projects" (
	"id" text PRIMARY KEY NOT NULL,
	"project_code" text NOT NULL,
	"project_name" text NOT NULL,
	"description" text,
	"status" text DEFAULT 'ACTIVE' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE UNIQUE INDEX "projects_project_code_idx" ON "projects" USING btree ("project_code") WHERE "projects"."deleted_at" is null;--> statement-breakpoint
CREATE INDEX "projects_status_idx" ON "projects" USING btree ("status");