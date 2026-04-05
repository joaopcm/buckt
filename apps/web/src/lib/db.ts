import { createDb } from "@buckt/db";
import { env } from "@/env";

const globalForDb = globalThis as unknown as {
  db?: ReturnType<typeof createDb>;
};

export const db =
  globalForDb.db ?? createDb(env.DATABASE_URL, { maxConnections: 3 });

globalForDb.db = db;
