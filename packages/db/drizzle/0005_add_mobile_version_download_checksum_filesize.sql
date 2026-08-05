ALTER TABLE "mobile_version" ADD COLUMN "download_url" text DEFAULT '' NOT NULL;
ALTER TABLE "mobile_version" ADD COLUMN "checksum" text DEFAULT '' NOT NULL;
ALTER TABLE "mobile_version" ADD COLUMN "file_size" integer DEFAULT 0 NOT NULL;
