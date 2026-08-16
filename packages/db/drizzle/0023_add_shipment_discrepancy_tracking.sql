CREATE TABLE "inbound_shipment_discrepancy_events" (
	"id" text PRIMARY KEY NOT NULL,
	"inbound_shipment_id" text NOT NULL,
	"action" text NOT NULL,
	"partner_response" text,
	"recipient_email" text,
	"notes" text,
	"actor_user_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "inbound_shipments" ADD COLUMN "discrepancy_status" text;--> statement-breakpoint
ALTER TABLE "inbound_shipments" ADD COLUMN "parent_shipment_id" text;--> statement-breakpoint
ALTER TABLE "inbound_shipment_discrepancy_events" ADD CONSTRAINT "inbound_shipment_discrepancy_events_inbound_shipment_id_inbound_shipments_id_fk" FOREIGN KEY ("inbound_shipment_id") REFERENCES "public"."inbound_shipments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inbound_shipment_discrepancy_events" ADD CONSTRAINT "inbound_shipment_discrepancy_events_actor_user_id_user_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "inbound_shipment_discrepancy_events_shipment_id_idx" ON "inbound_shipment_discrepancy_events" USING btree ("inbound_shipment_id");--> statement-breakpoint
CREATE INDEX "inbound_shipment_discrepancy_events_created_at_idx" ON "inbound_shipment_discrepancy_events" USING btree ("created_at");--> statement-breakpoint
ALTER TABLE "inbound_shipments" ADD CONSTRAINT "inbound_shipments_parent_shipment_id_inbound_shipments_id_fk" FOREIGN KEY ("parent_shipment_id") REFERENCES "public"."inbound_shipments"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "inbound_shipments_discrepancy_status_idx" ON "inbound_shipments" USING btree ("discrepancy_status");--> statement-breakpoint
CREATE INDEX "inbound_shipments_parent_shipment_id_idx" ON "inbound_shipments" USING btree ("parent_shipment_id");--> statement-breakpoint
UPDATE "inbound_shipments" s SET "discrepancy_status" = CASE WHEN EXISTS (
	SELECT 1 FROM "inbound_shipment_edc_items" i
	WHERE i."inbound_shipment_id" = s."id" AND (
		i."found_status" = 'MISSING'
		OR i."condition" = 'DAMAGED'
		OR i."completeness_status" = 'INCOMPLETE'
		OR i."is_unlisted" = true
	)
) OR EXISTS (
	SELECT 1 FROM "inbound_shipment_peripheral_items" p
	WHERE p."inbound_shipment_id" = s."id"
		AND p."received_qty" IS NOT NULL
		AND p."received_qty" <> p."documented_qty"
) THEN 'OPEN' ELSE 'NONE' END
WHERE s."status" = 'COMPLETED' AND s."discrepancy_status" IS NULL;
