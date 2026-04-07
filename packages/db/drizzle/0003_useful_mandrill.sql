CREATE TYPE "public"."bucket_visibility" AS ENUM('public', 'private');--> statement-breakpoint
CREATE TYPE "public"."cache_preset" AS ENUM('no-cache', 'short', 'standard', 'aggressive', 'immutable');--> statement-breakpoint
ALTER TABLE "buckets" ADD COLUMN "visibility" "bucket_visibility" DEFAULT 'public' NOT NULL;--> statement-breakpoint
ALTER TABLE "buckets" ADD COLUMN "cache_preset" "cache_preset" DEFAULT 'standard' NOT NULL;--> statement-breakpoint
ALTER TABLE "buckets" ADD COLUMN "cache_control_override" text;--> statement-breakpoint
ALTER TABLE "buckets" ADD COLUMN "cors_origins" text[] DEFAULT '{}' NOT NULL;--> statement-breakpoint
ALTER TABLE "buckets" ADD COLUMN "lifecycle_ttl_days" integer;