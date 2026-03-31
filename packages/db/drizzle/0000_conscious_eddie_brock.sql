CREATE TYPE "public"."bucket_status" AS ENUM('pending', 'provisioning', 'active', 'failed', 'deleting');--> statement-breakpoint
CREATE TABLE "api_keys" (
	"id" text PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"name" text NOT NULL,
	"hashed_key" text NOT NULL,
	"prefix" text NOT NULL,
	"permissions" jsonb NOT NULL,
	"system" boolean DEFAULT false NOT NULL,
	"last_used_at" timestamp,
	"expires_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "buckets" (
	"id" text PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"s3_bucket_name" text NOT NULL,
	"region" text DEFAULT 'us-east-1' NOT NULL,
	"custom_domain" text NOT NULL,
	"cloudfront_distribution_id" text,
	"acm_cert_arn" text,
	"status" "bucket_status" DEFAULT 'pending' NOT NULL,
	"dns_records" jsonb,
	"provisioning_job_id" text,
	"storage_used_bytes" bigint DEFAULT 0 NOT NULL,
	"bandwidth_used_bytes" bigint DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "api_keys_hashed_key_idx" ON "api_keys" USING btree ("hashed_key");--> statement-breakpoint
CREATE INDEX "api_keys_org_id_idx" ON "api_keys" USING btree ("org_id");--> statement-breakpoint
CREATE UNIQUE INDEX "buckets_slug_idx" ON "buckets" USING btree ("slug");--> statement-breakpoint
CREATE UNIQUE INDEX "buckets_s3_bucket_name_idx" ON "buckets" USING btree ("s3_bucket_name");--> statement-breakpoint
CREATE UNIQUE INDEX "buckets_custom_domain_idx" ON "buckets" USING btree ("custom_domain");--> statement-breakpoint
CREATE INDEX "buckets_org_id_idx" ON "buckets" USING btree ("org_id");