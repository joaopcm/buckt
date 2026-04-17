import { describe, expect, it } from "vitest";
import { createBucketSchema } from "./schemas/buckets";
import {
  generateManagedSubdomain,
  isManagedHostname,
  MANAGED_DOMAIN_SUFFIX,
} from "./subdomain";

const DOMAIN_REGEX = /^([a-z0-9]+(-[a-z0-9]+)*\.)+[a-z]{2,}$/;

describe("generateManagedSubdomain", () => {
  it("produces a hostname under cdn.buckt.dev", () => {
    const hostname = generateManagedSubdomain();
    expect(hostname.endsWith(`.${MANAGED_DOMAIN_SUFFIX}`)).toBe(true);
  });

  it("produces a hostname that matches the customDomain regex", () => {
    for (let i = 0; i < 50; i++) {
      const hostname = generateManagedSubdomain();
      expect(DOMAIN_REGEX.test(hostname)).toBe(true);
    }
  });

  it("produces hostnames that are highly unique across runs", () => {
    const seen = new Set<string>();
    for (let i = 0; i < 100; i++) {
      seen.add(generateManagedSubdomain());
    }
    expect(seen.size).toBeGreaterThan(95);
  });
});

describe("isManagedHostname", () => {
  it("is true for cdn.buckt.dev subdomains", () => {
    expect(isManagedHostname("velunambor.cdn.buckt.dev")).toBe(true);
  });

  it("is false for unrelated hostnames", () => {
    expect(isManagedHostname("cdn.example.com")).toBe(false);
  });

  it("is false for the apex cdn.buckt.dev", () => {
    expect(isManagedHostname("cdn.buckt.dev")).toBe(false);
  });

  it("is false for buckt.dev subdomains outside the managed subzone", () => {
    expect(isManagedHostname("mail.buckt.dev")).toBe(false);
  });
});

describe("createBucketSchema", () => {
  const base = {
    name: "test",
    region: "us-east-1" as const,
    visibility: "public" as const,
    cachePreset: "standard" as const,
    corsOrigins: [],
    lifecycleTtlDays: null,
    optimizationMode: "none" as const,
  };

  it("accepts a managed bucket without customDomain", () => {
    const parsed = createBucketSchema.parse({
      ...base,
      isManagedDomain: true,
    });
    expect(parsed.isManagedDomain).toBe(true);
    expect(parsed.customDomain).toBeUndefined();
  });

  it("rejects managed bucket with customDomain", () => {
    const result = createBucketSchema.safeParse({
      ...base,
      isManagedDomain: true,
      customDomain: "cdn.example.com",
    });
    expect(result.success).toBe(false);
  });

  it("rejects managed bucket with awsAccountId", () => {
    const result = createBucketSchema.safeParse({
      ...base,
      isManagedDomain: true,
      awsAccountId: "aws_acc_123",
    });
    expect(result.success).toBe(false);
  });

  it("rejects custom bucket without customDomain", () => {
    const result = createBucketSchema.safeParse({
      ...base,
      isManagedDomain: false,
    });
    expect(result.success).toBe(false);
  });

  it("accepts a custom bucket with customDomain", () => {
    const parsed = createBucketSchema.parse({
      ...base,
      isManagedDomain: false,
      customDomain: "cdn.example.com",
    });
    expect(parsed.customDomain).toBe("cdn.example.com");
  });
});
