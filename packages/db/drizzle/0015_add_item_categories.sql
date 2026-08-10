CREATE TABLE "item_categories" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"code" text,
	"accessory_category" text NOT NULL,
	"unit" text NOT NULL,
	"description" text,
	"status" text DEFAULT 'ACTIVE' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE UNIQUE INDEX "item_categories_name_idx" ON "item_categories" USING btree (lower("name")) WHERE "item_categories"."deleted_at" is null;--> statement-breakpoint
CREATE UNIQUE INDEX "item_categories_code_idx" ON "item_categories" USING btree ("code") WHERE "item_categories"."deleted_at" is null;--> statement-breakpoint
CREATE INDEX "item_categories_accessory_category_idx" ON "item_categories" USING btree ("accessory_category");--> statement-breakpoint
CREATE INDEX "item_categories_status_idx" ON "item_categories" USING btree ("status");