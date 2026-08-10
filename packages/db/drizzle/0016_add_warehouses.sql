CREATE TABLE "warehouses" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"code" text NOT NULL,
	"type" text NOT NULL,
	"parent_id" text,
	"region" text NOT NULL,
	"address" text NOT NULL,
	"pic_name" text NOT NULL,
	"pic_contact" text,
	"capacity" integer,
	"status" text DEFAULT 'ACTIVE' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "warehouses" ADD CONSTRAINT "warehouses_parent_id_warehouses_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."warehouses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "warehouses_code_idx" ON "warehouses" USING btree ("code") WHERE "warehouses"."deleted_at" is null;--> statement-breakpoint
CREATE INDEX "warehouses_parent_id_idx" ON "warehouses" USING btree ("parent_id");--> statement-breakpoint
CREATE INDEX "warehouses_type_idx" ON "warehouses" USING btree ("type");--> statement-breakpoint
CREATE INDEX "warehouses_status_idx" ON "warehouses" USING btree ("status");