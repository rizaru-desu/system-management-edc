CREATE TABLE "merchants" (
	"id" text PRIMARY KEY NOT NULL,
	"merchant_code" text NOT NULL,
	"merchant_name" text NOT NULL,
	"merchant_type" text,
	"pic_name" text,
	"phone_number" text,
	"email" text,
	"address" text,
	"province" text,
	"city" text,
	"district" text,
	"postal_code" text,
	"latitude" double precision,
	"longitude" double precision,
	"service_point_id" text NOT NULL,
	"status" text DEFAULT 'ACTIVE' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "merchants" ADD CONSTRAINT "merchants_service_point_id_service_points_id_fk" FOREIGN KEY ("service_point_id") REFERENCES "public"."service_points"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "merchants_merchant_code_idx" ON "merchants" USING btree ("merchant_code") WHERE "merchants"."deleted_at" is null;--> statement-breakpoint
CREATE INDEX "merchants_service_point_id_idx" ON "merchants" USING btree ("service_point_id");--> statement-breakpoint
CREATE INDEX "merchants_status_idx" ON "merchants" USING btree ("status");