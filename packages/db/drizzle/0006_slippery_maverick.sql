CREATE TABLE "mobile_devices" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"device_id" text NOT NULL,
	"platform" text DEFAULT 'android' NOT NULL,
	"brand" text,
	"manufacturer" text,
	"model" text,
	"android_version" text,
	"sdk_version" text,
	"app_version" text,
	"build_number" text,
	"carrier" text,
	"network_type" text,
	"is_rooted" boolean DEFAULT false NOT NULL,
	"is_developer_mode" boolean DEFAULT false NOT NULL,
	"is_emulator" boolean DEFAULT false NOT NULL,
	"fcm_token" text,
	"status" text DEFAULT 'ACTIVE' NOT NULL,
	"login_count" integer DEFAULT 1 NOT NULL,
	"last_login_at" timestamp DEFAULT now(),
	"last_logout_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mobile_login_history" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"device_id" text NOT NULL,
	"platform" text DEFAULT 'android',
	"brand" text,
	"manufacturer" text,
	"model" text,
	"android_version" text,
	"sdk_version" text,
	"app_version" text,
	"build_number" text,
	"carrier" text,
	"network_type" text,
	"is_rooted" boolean DEFAULT false,
	"is_developer_mode" boolean DEFAULT false,
	"is_emulator" boolean DEFAULT false,
	"fcm_token" text,
	"ip_address" text,
	"user_agent" text,
	"login_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mobile_logout_history" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"device_id" text NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"logout_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "mobile_devices" ADD CONSTRAINT "mobile_devices_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mobile_login_history" ADD CONSTRAINT "mobile_login_history_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mobile_logout_history" ADD CONSTRAINT "mobile_logout_history_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "mobile_devices_user_device_idx" ON "mobile_devices" USING btree ("user_id","device_id");--> statement-breakpoint
CREATE INDEX "mobile_devices_device_id_idx" ON "mobile_devices" USING btree ("device_id");--> statement-breakpoint
CREATE INDEX "mobile_devices_user_id_idx" ON "mobile_devices" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "mobile_login_history_user_id_idx" ON "mobile_login_history" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "mobile_login_history_device_id_idx" ON "mobile_login_history" USING btree ("device_id");--> statement-breakpoint
CREATE INDEX "mobile_login_history_login_at_idx" ON "mobile_login_history" USING btree ("login_at");--> statement-breakpoint
CREATE INDEX "mobile_logout_history_user_id_idx" ON "mobile_logout_history" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "mobile_logout_history_device_id_idx" ON "mobile_logout_history" USING btree ("device_id");