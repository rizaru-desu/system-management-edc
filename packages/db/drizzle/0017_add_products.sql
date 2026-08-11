CREATE TABLE "product_completeness_items" (
	"id" text PRIMARY KEY NOT NULL,
	"product_id" text NOT NULL,
	"item_category_id" text NOT NULL,
	"required" boolean DEFAULT true NOT NULL,
	"standard_qty" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" text PRIMARY KEY NOT NULL,
	"model_name" text NOT NULL,
	"brand" text NOT NULL,
	"category" text NOT NULL,
	"description" text,
	"photo_url" text,
	"status" text DEFAULT 'ACTIVE' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "product_completeness_items" ADD CONSTRAINT "product_completeness_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_completeness_items" ADD CONSTRAINT "product_completeness_items_item_category_id_item_categories_id_fk" FOREIGN KEY ("item_category_id") REFERENCES "public"."item_categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "product_completeness_items_product_item_idx" ON "product_completeness_items" USING btree ("product_id","item_category_id");--> statement-breakpoint
CREATE INDEX "product_completeness_items_product_id_idx" ON "product_completeness_items" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "product_completeness_items_item_category_id_idx" ON "product_completeness_items" USING btree ("item_category_id");--> statement-breakpoint
CREATE UNIQUE INDEX "products_model_name_idx" ON "products" USING btree (lower("model_name")) WHERE "products"."deleted_at" is null;--> statement-breakpoint
CREATE INDEX "products_category_idx" ON "products" USING btree ("category");--> statement-breakpoint
CREATE INDEX "products_status_idx" ON "products" USING btree ("status");