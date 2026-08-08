CREATE TABLE "contract_lines" (
	"id" text PRIMARY KEY NOT NULL,
	"line_number" text NOT NULL,
	"line_name" text NOT NULL,
	"status" text DEFAULT 'ACTIVE' NOT NULL,
	"document_status" text DEFAULT 'DRAFT' NOT NULL,
	"vendor_edc" text,
	"account_id" text NOT NULL,
	"project_id" text NOT NULL,
	"service_item" text,
	"start_date" date,
	"end_date" date,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "contract_lines" ADD CONSTRAINT "contract_lines_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contract_lines" ADD CONSTRAINT "contract_lines_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "contract_lines_line_number_idx" ON "contract_lines" USING btree ("line_number") WHERE "contract_lines"."deleted_at" is null;--> statement-breakpoint
CREATE INDEX "contract_lines_account_id_idx" ON "contract_lines" USING btree ("account_id");--> statement-breakpoint
CREATE INDEX "contract_lines_project_id_idx" ON "contract_lines" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "contract_lines_status_idx" ON "contract_lines" USING btree ("status");