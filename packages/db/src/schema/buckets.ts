import { pgTable, pgEnum, text, bigint, timestamp, jsonb, uniqueIndex, index } from "drizzle-orm/pg-core"
import { uuidv7 } from "uuidv7"

export const bucketStatusEnum = pgEnum("bucket_status", [
  "pending",
  "provisioning",
  "active",
  "failed",
  "deleting",
])

export const buckets = pgTable(
  "buckets",
  {
    id: text("id").primaryKey().$defaultFn(() => uuidv7()),
    orgId: text("org_id").notNull(),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    s3BucketName: text("s3_bucket_name").notNull(),
    region: text("region").default("us-east-1").notNull(),
    customDomain: text("custom_domain").notNull(),
    cloudfrontDistributionId: text("cloudfront_distribution_id"),
    acmCertArn: text("acm_cert_arn"),
    status: bucketStatusEnum("status").default("pending").notNull(),
    dnsRecords: jsonb("dns_records"),
    provisioningJobId: text("provisioning_job_id"),
    storageUsedBytes: bigint("storage_used_bytes", { mode: "number" }).default(0).notNull(),
    bandwidthUsedBytes: bigint("bandwidth_used_bytes", { mode: "number" }).default(0).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().$onUpdate(() => new Date()).notNull(),
  },
  (table) => [
    uniqueIndex("buckets_slug_idx").on(table.slug),
    uniqueIndex("buckets_s3_bucket_name_idx").on(table.s3BucketName),
    uniqueIndex("buckets_custom_domain_idx").on(table.customDomain),
    index("buckets_org_id_idx").on(table.orgId),
  ],
)
