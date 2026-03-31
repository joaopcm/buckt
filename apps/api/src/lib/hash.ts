import { createHash, randomBytes } from "node:crypto"

export function hashApiKey(key: string): string {
  return createHash("sha256").update(key).digest("hex")
}

export function generateApiKey(): { key: string; prefix: string; hashedKey: string } {
  const raw = randomBytes(32).toString("base64url")
  const key = `bkt_${raw}`
  const prefix = key.slice(0, 8)
  const hashedKey = hashApiKey(key)
  return { key, prefix, hashedKey }
}
