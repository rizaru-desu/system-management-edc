CREATE TABLE "payment_methods" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"code" text,
	"description" text,
	"status" text DEFAULT 'ACTIVE' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "product_payment_methods" (
	"id" text PRIMARY KEY NOT NULL,
	"product_id" text NOT NULL,
	"payment_method_id" text NOT NULL,
	"required" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "product_payment_methods" ADD CONSTRAINT "product_payment_methods_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_payment_methods" ADD CONSTRAINT "product_payment_methods_payment_method_id_payment_methods_id_fk" FOREIGN KEY ("payment_method_id") REFERENCES "public"."payment_methods"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "payment_methods_name_idx" ON "payment_methods" USING btree (lower("name")) WHERE "payment_methods"."deleted_at" is null;--> statement-breakpoint
CREATE UNIQUE INDEX "payment_methods_code_idx" ON "payment_methods" USING btree ("code") WHERE "payment_methods"."deleted_at" is null and "payment_methods"."code" is not null;--> statement-breakpoint
CREATE INDEX "payment_methods_status_idx" ON "payment_methods" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "product_payment_methods_product_method_idx" ON "product_payment_methods" USING btree ("product_id","payment_method_id");--> statement-breakpoint
CREATE INDEX "product_payment_methods_product_id_idx" ON "product_payment_methods" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "product_payment_methods_payment_method_id_idx" ON "product_payment_methods" USING btree ("payment_method_id");