ALTER TABLE "aws_accounts" ADD COLUMN "acm_webhook_secret" text;--> statement-breakpoint
ALTER TABLE "buckets" ADD COLUMN "acm_wait_token_id" text;