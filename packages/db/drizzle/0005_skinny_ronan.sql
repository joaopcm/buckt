ALTER TABLE "buckets" ADD COLUMN "domain_connect_provider" text;--> statement-breakpoint
ALTER TABLE "buckets" ADD COLUMN "domain_connect_access_token" text;--> statement-breakpoint
ALTER TABLE "buckets" ADD COLUMN "domain_connect_refresh_token" text;--> statement-breakpoint
ALTER TABLE "buckets" ADD COLUMN "domain_connect_token_expires_at" timestamp;