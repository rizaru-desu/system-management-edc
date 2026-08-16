ALTER TABLE "inbound_shipments" ADD COLUMN "project_id" text;--> statement-breakpoint
ALTER TABLE "terminals" ADD COLUMN "project_id" text;--> statement-breakpoint
ALTER TABLE "inbound_shipments" ADD CONSTRAINT "inbound_shipments_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "terminals" ADD CONSTRAINT "terminals_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "terminals_project_id_idx" ON "terminals" USING btree ("project_id");