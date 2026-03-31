import { pgTable, text, boolean, timestamp, jsonb, uniqueIndex, index } from "drizzle-orm/pg-core"
import { uuidv7 } from "uuidv7"

export const apiKeys = pgTable(
  "api_keys",
  {
    id: text("id").primaryKey().$defaultFn(() => uuidv7()),
    orgId: text("org_id").notNull(),
    name: text("name").notNull(),
    hashedKey: text("hashed_key").notNull(),
    prefix: text("prefix").notNull(),
    permissions: jsonb("permissions").$type<string[]>().notNull(),
    system: boolean("system").default(false).notNull(),
    lastUsedAt: timestamp("last_used_at"),
    expiresAt: timestamp("expires_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("api_keys_hashed_key_idx").on(table.hashedKey),
    index("api_keys_org_id_idx").on(table.orgId),
  ],
)
