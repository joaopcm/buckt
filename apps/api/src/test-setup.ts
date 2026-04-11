import { vi } from "vitest";

vi.mock("./trigger/provision-bucket", () => ({
  provisionBucket: {
    trigger: vi.fn().mockResolvedValue({ id: "test-run-id" }),
  },
}));

vi.mock("./trigger/destroy-bucket", () => ({
  destroyBucket: {
    trigger: vi.fn().mockResolvedValue({ id: "test-run-id" }),
  },
}));

vi.mock("./lib/redis", () => ({
  redis: {},
}));

vi.mock("./utils/rate-limit-store", () => ({
  checkRateLimit: vi.fn().mockResolvedValue({
    allowed: true,
    limit: 100,
    remaining: 99,
    resetAt: Math.ceil(Date.now() / 1000) + 60,
  }),
}));
