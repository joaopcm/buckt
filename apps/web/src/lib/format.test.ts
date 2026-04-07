import { describe, expect, it } from "vitest";
import { formatBytes, formatDate } from "./format";

describe("formatDate", () => {
  it("returns empty string for null", () => {
    expect(formatDate(null)).toBe("");
  });

  it("returns empty string for undefined", () => {
    expect(formatDate(undefined)).toBe("");
  });

  it("formats a Date object", () => {
    const date = new Date("2026-03-07T12:00:00Z");
    expect(formatDate(date)).toBe("Mar 7, 2026");
  });

  it("formats an ISO string", () => {
    expect(formatDate("2026-12-25T12:00:00Z")).toBe("Dec 25, 2026");
  });

  it("formats a date-only string", () => {
    expect(formatDate("2026-01-01T12:00:00Z")).toBe("Jan 1, 2026");
  });
});

describe("formatBytes", () => {
  it("returns 0 B for zero", () => {
    expect(formatBytes(0)).toBe("0 B");
  });

  it("formats bytes", () => {
    expect(formatBytes(500)).toBe("500 B");
  });

  it("formats kilobytes", () => {
    expect(formatBytes(1024)).toBe("1.0 KB");
  });

  it("formats megabytes", () => {
    expect(formatBytes(1024 * 1024 * 5)).toBe("5.0 MB");
  });

  it("formats gigabytes", () => {
    expect(formatBytes(1024 * 1024 * 1024 * 24.3)).toBe("24 GB");
  });

  it("formats terabytes", () => {
    expect(formatBytes(1024 * 1024 * 1024 * 1024)).toBe("1.0 TB");
  });
});
