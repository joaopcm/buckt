import { describe, expect, it } from "vitest";
import { generateApiKey, hashApiKey } from "./hash";

const HEX_PATTERN = /^[a-f0-9]+$/;

describe("hashApiKey", () => {
  it("returns a sha256 hex digest", () => {
    const hash = hashApiKey("test-key");
    expect(hash).toHaveLength(64);
    expect(hash).toMatch(HEX_PATTERN);
  });

  it("is deterministic", () => {
    expect(hashApiKey("same")).toBe(hashApiKey("same"));
  });

  it("produces different hashes for different inputs", () => {
    expect(hashApiKey("a")).not.toBe(hashApiKey("b"));
  });
});

describe("generateApiKey", () => {
  it("returns key, prefix, and hashedKey", () => {
    const result = generateApiKey();
    expect(result).toHaveProperty("key");
    expect(result).toHaveProperty("prefix");
    expect(result).toHaveProperty("hashedKey");
  });

  it("key starts with bkt_", () => {
    const { key } = generateApiKey();
    expect(key.startsWith("bkt_")).toBe(true);
  });

  it("prefix is first 8 chars of key", () => {
    const { key, prefix } = generateApiKey();
    expect(prefix).toBe(key.slice(0, 8));
  });

  it("hashedKey matches hashing the key", () => {
    const { key, hashedKey } = generateApiKey();
    expect(hashedKey).toBe(hashApiKey(key));
  });

  it("generates unique keys", () => {
    const a = generateApiKey();
    const b = generateApiKey();
    expect(a.key).not.toBe(b.key);
  });
});
