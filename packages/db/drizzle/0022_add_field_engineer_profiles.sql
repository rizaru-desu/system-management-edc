CREATE TABLE "field_engineer_profiles" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"warehouse_id" text NOT NULL,
	"coverage_region" text NOT NULL,
	"specializations" text NOT NULL,
	"status" text DEFAULT 'ACTIVE' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "field_engineer_profiles" ADD CONSTRAINT "field_engineer_profiles_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "field_engineer_profiles" ADD CONSTRAINT "field_engineer_profiles_warehouse_id_warehouses_id_fk" FOREIGN KEY ("warehouse_id") REFERENCES "public"."warehouses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "field_engineer_profiles_user_id_idx" ON "field_engineer_profiles" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "field_engineer_profiles_warehouse_id_idx" ON "field_engineer_profiles" USING btree ("warehouse_id");--> statement-breakpoint
CREATE INDEX "field_engineer_profiles_status_idx" ON "field_engineer_profiles" USING btree ("status");