CREATE TABLE "inbound_shipment_edc_item_accessories" (
	"id" text PRIMARY KEY NOT NULL,
	"inbound_shipment_edc_item_id" text NOT NULL,
	"item_category_id" text NOT NULL,
	"is_required" boolean DEFAULT true NOT NULL,
	"standard_qty" integer DEFAULT 1 NOT NULL,
	"is_present" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "inbound_shipment_edc_items" (
	"id" text PRIMARY KEY NOT NULL,
	"inbound_shipment_id" text NOT NULL,
	"serial_number" text NOT NULL,
	"product_id" text NOT NULL,
	"is_unlisted" boolean DEFAULT false NOT NULL,
	"found_status" text DEFAULT 'PENDING' NOT NULL,
	"condition" text,
	"completeness_status" text,
	"notes" text,
	"photo_url" text,
	"resulting_terminal_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "inbound_shipment_peripheral_items" (
	"id" text PRIMARY KEY NOT NULL,
	"inbound_shipment_id" text NOT NULL,
	"item_category_id" text NOT NULL,
	"documented_qty" integer NOT NULL,
	"received_qty" integer,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "inbound_shipments" (
	"id" text PRIMARY KEY NOT NULL,
	"do_number" text NOT NULL,
	"partner_account_id" text NOT NULL,
	"destination_warehouse_id" text NOT NULL,
	"shipment_date" date,
	"received_date" date NOT NULL,
	"status" text DEFAULT 'DRAFT' NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "warehouse_item_stocks" (
	"id" text PRIMARY KEY NOT NULL,
	"warehouse_id" text NOT NULL,
	"item_category_id" text NOT NULL,
	"quantity" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "inbound_shipment_edc_item_accessories" ADD CONSTRAINT "inbound_shipment_edc_item_accessories_inbound_shipment_edc_item_id_inbound_shipment_edc_items_id_fk" FOREIGN KEY ("inbound_shipment_edc_item_id") REFERENCES "public"."inbound_shipment_edc_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inbound_shipment_edc_item_accessories" ADD CONSTRAINT "inbound_shipment_edc_item_accessories_item_category_id_item_categories_id_fk" FOREIGN KEY ("item_category_id") REFERENCES "public"."item_categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inbound_shipment_edc_items" ADD CONSTRAINT "inbound_shipment_edc_items_inbound_shipment_id_inbound_shipments_id_fk" FOREIGN KEY ("inbound_shipment_id") REFERENCES "public"."inbound_shipments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inbound_shipment_edc_items" ADD CONSTRAINT "inbound_shipment_edc_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inbound_shipment_edc_items" ADD CONSTRAINT "inbound_shipment_edc_items_resulting_terminal_id_terminals_id_fk" FOREIGN KEY ("resulting_terminal_id") REFERENCES "public"."terminals"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inbound_shipment_peripheral_items" ADD CONSTRAINT "inbound_shipment_peripheral_items_inbound_shipment_id_inbound_shipments_id_fk" FOREIGN KEY ("inbound_shipment_id") REFERENCES "public"."inbound_shipments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inbound_shipment_peripheral_items" ADD CONSTRAINT "inbound_shipment_peripheral_items_item_category_id_item_categories_id_fk" FOREIGN KEY ("item_category_id") REFERENCES "public"."item_categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inbound_shipments" ADD CONSTRAINT "inbound_shipments_partner_account_id_accounts_id_fk" FOREIGN KEY ("partner_account_id") REFERENCES "public"."accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inbound_shipments" ADD CONSTRAINT "inbound_shipments_destination_warehouse_id_warehouses_id_fk" FOREIGN KEY ("destination_warehouse_id") REFERENCES "public"."warehouses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "warehouse_item_stocks" ADD CONSTRAINT "warehouse_item_stocks_warehouse_id_warehouses_id_fk" FOREIGN KEY ("warehouse_id") REFERENCES "public"."warehouses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "warehouse_item_stocks" ADD CONSTRAINT "warehouse_item_stocks_item_category_id_item_categories_id_fk" FOREIGN KEY ("item_category_id") REFERENCES "public"."item_categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "inbound_shipment_edc_item_accessories_item_idx" ON "inbound_shipment_edc_item_accessories" USING btree ("inbound_shipment_edc_item_id","item_category_id");--> statement-breakpoint
CREATE INDEX "inbound_shipment_edc_item_accessories_edc_item_id_idx" ON "inbound_shipment_edc_item_accessories" USING btree ("inbound_shipment_edc_item_id");--> statement-breakpoint
CREATE UNIQUE INDEX "inbound_shipment_edc_items_shipment_serial_idx" ON "inbound_shipment_edc_items" USING btree ("inbound_shipment_id",lower("serial_number"));--> statement-breakpoint
CREATE INDEX "inbound_shipment_edc_items_shipment_id_idx" ON "inbound_shipment_edc_items" USING btree ("inbound_shipment_id");--> statement-breakpoint
CREATE INDEX "inbound_shipment_edc_items_product_id_idx" ON "inbound_shipment_edc_items" USING btree ("product_id");--> statement-breakpoint
CREATE UNIQUE INDEX "inbound_shipment_peripheral_items_shipment_item_idx" ON "inbound_shipment_peripheral_items" USING btree ("inbound_shipment_id","item_category_id");--> statement-breakpoint
CREATE INDEX "inbound_shipment_peripheral_items_shipment_id_idx" ON "inbound_shipment_peripheral_items" USING btree ("inbound_shipment_id");--> statement-breakpoint
CREATE UNIQUE INDEX "inbound_shipments_do_number_idx" ON "inbound_shipments" USING btree (lower("do_number")) WHERE "inbound_shipments"."deleted_at" is null;--> statement-breakpoint
CREATE INDEX "inbound_shipments_partner_account_id_idx" ON "inbound_shipments" USING btree ("partner_account_id");--> statement-breakpoint
CREATE INDEX "inbound_shipments_destination_warehouse_id_idx" ON "inbound_shipments" USING btree ("destination_warehouse_id");--> statement-breakpoint
CREATE INDEX "inbound_shipments_status_idx" ON "inbound_shipments" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "warehouse_item_stocks_warehouse_item_idx" ON "warehouse_item_stocks" USING btree ("warehouse_id","item_category_id");--> statement-breakpoint
CREATE INDEX "warehouse_item_stocks_warehouse_id_idx" ON "warehouse_item_stocks" USING btree ("warehouse_id");