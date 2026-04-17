import {
  bigint,
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { uuidv7 } from "uuidv7";

export const bucketStatusEnum = pgEnum("bucket_status", [
  "pending",
  "provisioning",
  "active",
  "failed",
  "deleting",
]);

export const bucketVisibilityEnum = pgEnum("bucket_visibility", [
  "public",
  "private",
]);

export const cachePresetEnum = pgEnum("cache_preset", [
  "no-cache",
  "short",
  "standard",
  "aggressive",
  "immutable",
]);

export const optimizationModeEnum = pgEnum("optimization_mode", [
  "none",
  "light",
  "balanced",
  "maximum",
]);

export const buckets = pgTable(
  "buckets",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => uuidv7()),
    orgId: text("org_id").notNull(),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    s3BucketName: text("s3_bucket_name").notNull(),
    region: text("region").default("us-east-1").notNull(),
    customDomain: text("custom_domain").notNull(),
    cloudfrontDistributionId: text("cloudfront_distribution_id"),
    acmCertArn: text("acm_cert_arn"),
    acmWaitTokenId: text("acm_wait_token_id"),
    status: bucketStatusEnum("status").default("pending").notNull(),
    dnsRecords: jsonb("dns_records"),
    provisioningJobId: text("provisioning_job_id"),
    storageUsedBytes: bigint("storage_used_bytes", { mode: "number" })
      .default(0)
      .notNull(),
    bandwidthUsedBytes: bigint("bandwidth_used_bytes", { mode: "number" })
      .default(0)
      .notNull(),
    visibility: bucketVisibilityEnum("visibility").default("public").notNull(),
    cachePreset: cachePresetEnum("cache_preset").default("standard").notNull(),
    cacheControlOverride: text("cache_control_override"),
    corsOrigins: text("cors_origins").array().default([]).notNull(),
    lifecycleTtlDays: integer("lifecycle_ttl_days"),
    optimizationMode: optimizationModeEnum("optimization_mode")
      .default("none")
      .notNull(),
    domainConnectProvider: text("domain_connect_provider"),
    awsAccountId: text("aws_account_id"),
    isImported: boolean("is_imported").default(false).notNull(),
    isManagedDomain: boolean("is_managed_domain").default(false).notNull(),
    managedSettings: jsonb("managed_settings").default({}).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    uniqueIndex("buckets_slug_idx").on(table.slug),
    uniqueIndex("buckets_s3_bucket_name_idx").on(table.s3BucketName),
    uniqueIndex("buckets_custom_domain_idx").on(table.customDomain),
    index("buckets_org_id_idx").on(table.orgId),
  ]
);
