import { vi } from "vitest"

vi.mock("./trigger/provision-bucket", () => ({
  provisionBucket: {
    trigger: vi.fn().mockResolvedValue({ id: "test-run-id" }),
  },
}))

vi.mock("./trigger/destroy-bucket", () => ({
  destroyBucket: {
    trigger: vi.fn().mockResolvedValue({ id: "test-run-id" }),
  },
}))
