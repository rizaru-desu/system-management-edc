CREATE TABLE "peripheral_stock_movements" (
	"id" text PRIMARY KEY NOT NULL,
	"warehouse_id" text NOT NULL,
	"item_category_id" text NOT NULL,
	"quantity_change" integer NOT NULL,
	"reason" text NOT NULL,
	"related_shipment_id" text,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "peripheral_stock_movements" ADD CONSTRAINT "peripheral_stock_movements_warehouse_id_warehouses_id_fk" FOREIGN KEY ("warehouse_id") REFERENCES "public"."warehouses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "peripheral_stock_movements" ADD CONSTRAINT "peripheral_stock_movements_item_category_id_item_categories_id_fk" FOREIGN KEY ("item_category_id") REFERENCES "public"."item_categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "peripheral_stock_movements" ADD CONSTRAINT "peripheral_stock_movements_related_shipment_id_inbound_shipments_id_fk" FOREIGN KEY ("related_shipment_id") REFERENCES "public"."inbound_shipments"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "peripheral_stock_movements_warehouse_id_idx" ON "peripheral_stock_movements" USING btree ("warehouse_id");--> statement-breakpoint
CREATE INDEX "peripheral_stock_movements_item_category_id_idx" ON "peripheral_stock_movements" USING btree ("item_category_id");--> statement-breakpoint
CREATE INDEX "peripheral_stock_movements_created_at_idx" ON "peripheral_stock_movements" USING btree ("created_at");