CREATE TYPE "public"."aws_account_status" AS ENUM('pending', 'validating', 'active', 'failed');--> statement-breakpoint
CREATE TABLE "aws_accounts" (
	"id" text PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"aws_account_id" text NOT NULL,
	"role_arn" text DEFAULT '' NOT NULL,
	"external_id" text NOT NULL,
	"stack_id" text,
	"label" text,
	"status" "aws_account_status" DEFAULT 'pending' NOT NULL,
	"last_validated_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "buckets" ADD COLUMN "aws_account_id" text;--> statement-breakpoint
ALTER TABLE "buckets" ADD COLUMN "is_imported" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "buckets" ADD COLUMN "managed_settings" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "aws_accounts_org_aws_idx" ON "aws_accounts" USING btree ("org_id","aws_account_id");--> statement-breakpoint
CREATE INDEX "aws_accounts_org_id_idx" ON "aws_accounts" USING btree ("org_id");