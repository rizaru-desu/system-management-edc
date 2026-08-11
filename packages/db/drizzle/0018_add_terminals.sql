CREATE TABLE "terminal_status_history" (
	"id" text PRIMARY KEY NOT NULL,
	"terminal_id" text NOT NULL,
	"from_status" text,
	"to_status" text NOT NULL,
	"from_warehouse_id" text,
	"to_warehouse_id" text,
	"changed_by_user_id" text,
	"notes" text,
	"changed_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "terminals" (
	"id" text PRIMARY KEY NOT NULL,
	"serial_number" text NOT NULL,
	"product_id" text NOT NULL,
	"warehouse_id" text,
	"status" text DEFAULT 'IN_STOCK' NOT NULL,
	"condition" text NOT NULL,
	"merchant_id" text,
	"notes" text,
	"entered_system_at" date NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "terminal_status_history" ADD CONSTRAINT "terminal_status_history_terminal_id_terminals_id_fk" FOREIGN KEY ("terminal_id") REFERENCES "public"."terminals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "terminal_status_history" ADD CONSTRAINT "terminal_status_history_from_warehouse_id_warehouses_id_fk" FOREIGN KEY ("from_warehouse_id") REFERENCES "public"."warehouses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "terminal_status_history" ADD CONSTRAINT "terminal_status_history_to_warehouse_id_warehouses_id_fk" FOREIGN KEY ("to_warehouse_id") REFERENCES "public"."warehouses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "terminal_status_history" ADD CONSTRAINT "terminal_status_history_changed_by_user_id_user_id_fk" FOREIGN KEY ("changed_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "terminals" ADD CONSTRAINT "terminals_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "terminals" ADD CONSTRAINT "terminals_warehouse_id_warehouses_id_fk" FOREIGN KEY ("warehouse_id") REFERENCES "public"."warehouses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "terminals" ADD CONSTRAINT "terminals_merchant_id_merchants_id_fk" FOREIGN KEY ("merchant_id") REFERENCES "public"."merchants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "terminal_status_history_terminal_id_idx" ON "terminal_status_history" USING btree ("terminal_id");--> statement-breakpoint
CREATE INDEX "terminal_status_history_changed_at_idx" ON "terminal_status_history" USING btree ("changed_at");--> statement-breakpoint
CREATE UNIQUE INDEX "terminals_serial_number_idx" ON "terminals" USING btree ("serial_number") WHERE "terminals"."deleted_at" is null;--> statement-breakpoint
CREATE INDEX "terminals_product_id_idx" ON "terminals" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "terminals_warehouse_id_idx" ON "terminals" USING btree ("warehouse_id");--> statement-breakpoint
CREATE INDEX "terminals_status_idx" ON "terminals" USING btree ("status");