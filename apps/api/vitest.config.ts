import { defineConfig } from "vitest/config"
import { config } from "dotenv"
import { existsSync } from "node:fs"
import { resolve } from "node:path"

const root = resolve(__dirname, "../..")
const envFile = existsSync(resolve(root, ".env"))
  ? resolve(root, ".env")
  : resolve(root, ".env.example")

config({ path: envFile, override: false })

export default defineConfig({
  test: {
    include: ["src/**/*.spec.ts"],
    setupFiles: ["src/test-setup.ts"],
    fileParallelism: false,
  },
})
