DO $$ BEGIN CREATE TYPE "public"."bucket_visibility" AS ENUM('public', 'private'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;--> statement-breakpoint
DO $$ BEGIN CREATE TYPE "public"."cache_preset" AS ENUM('no-cache', 'short', 'standard', 'aggressive', 'immutable'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;--> statement-breakpoint
ALTER TABLE "buckets" ADD COLUMN IF NOT EXISTS "visibility" "bucket_visibility" DEFAULT 'public' NOT NULL;--> statement-breakpoint
ALTER TABLE "buckets" ADD COLUMN IF NOT EXISTS "cache_preset" "cache_preset" DEFAULT 'standard' NOT NULL;--> statement-breakpoint
ALTER TABLE "buckets" ADD COLUMN IF NOT EXISTS "cache_control_override" text;--> statement-breakpoint
ALTER TABLE "buckets" ADD COLUMN IF NOT EXISTS "cors_origins" text[] DEFAULT '{}' NOT NULL;--> statement-breakpoint
ALTER TABLE "buckets" ADD COLUMN IF NOT EXISTS "lifecycle_ttl_days" integer;