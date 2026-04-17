import {
  index,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { uuidv7 } from "uuidv7";

export const awsAccountStatusEnum = pgEnum("aws_account_status", [
  "pending",
  "validating",
  "active",
  "failed",
]);

export const awsAccounts = pgTable(
  "aws_accounts",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => uuidv7()),
    orgId: text("org_id").notNull(),
    awsAccountId: text("aws_account_id").notNull(),
    roleArn: text("role_arn").default("").notNull(),
    externalId: text("external_id").notNull(),
    acmWebhookSecret: text("acm_webhook_secret"),
    stackId: text("stack_id"),
    label: text("label"),
    status: awsAccountStatusEnum("status").default("pending").notNull(),
    lastValidatedAt: timestamp("last_validated_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    uniqueIndex("aws_accounts_org_aws_idx").on(table.orgId, table.awsAccountId),
    index("aws_accounts_org_id_idx").on(table.orgId),
  ]
);
