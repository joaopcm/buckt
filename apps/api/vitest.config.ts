import { defineConfig } from "vitest/config"
import { config } from "dotenv"
import { resolve } from "node:path"

config({ path: resolve(__dirname, "../../.env"), override: false })

export default defineConfig({
  test: {
    include: ["src/**/*.spec.ts"],
    setupFiles: ["src/test-setup.ts"],
    fileParallelism: false,
    env: {
      STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY ?? "sk_test_placeholder",
      TRIGGER_SECRET_KEY: process.env.TRIGGER_SECRET_KEY ?? "test",
    },
  },
})
