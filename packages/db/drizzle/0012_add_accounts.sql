CREATE TABLE "accounts" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"account_name" text NOT NULL,
	"account_type" text NOT NULL,
	"status" text DEFAULT 'ACTIVE' NOT NULL,
	"billing_name" text,
	"tax_id" text,
	"billing_address" text,
	"city" text,
	"region" text,
	"pic_name" text,
	"pic_phone" text,
	"pic_email" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE UNIQUE INDEX "accounts_account_id_idx" ON "accounts" USING btree ("account_id") WHERE "accounts"."deleted_at" is null;--> statement-breakpoint
CREATE INDEX "accounts_account_type_idx" ON "accounts" USING btree ("account_type");--> statement-breakpoint
CREATE INDEX "accounts_status_idx" ON "accounts" USING btree ("status");