import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { config } from "dotenv";
import { defineConfig } from "vitest/config";

const root = resolve(import.meta.dirname, "../..");
const envFile = existsSync(resolve(root, ".env"))
  ? resolve(root, ".env")
  : resolve(root, ".env.example");

config({ path: envFile, override: false });

export default defineConfig({
  test: {
    include: ["src/**/*.spec.ts"],
    setupFiles: ["src/test-setup.ts"],
    fileParallelism: false,
    env: {
      REDIS_URL: process.env.REDIS_URL ?? "redis://localhost:6379",
    },
  },
});
