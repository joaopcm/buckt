import { describe, expect, it } from "vitest";
import { getInitials } from "./get-initials";

describe("getInitials", () => {
  it("returns two initials from a two-word name", () => {
    expect(getInitials("Acme Corp")).toBe("AC");
  });

  it("returns single initial from a one-word name", () => {
    expect(getInitials("Acme")).toBe("A");
  });

  it("truncates to two characters for three+ words", () => {
    expect(getInitials("John Doe Inc")).toBe("JD");
  });

  it("uppercases lowercase input", () => {
    expect(getInitials("hello world")).toBe("HW");
  });

  it("strips non-alphanumeric characters", () => {
    expect(getInitials("@acme #corp")).toBe("AC");
  });

  it("handles extra whitespace", () => {
    expect(getInitials("  Acme   Corp  ")).toBe("AC");
  });

  it("returns empty string for empty input", () => {
    expect(getInitials("")).toBe("");
  });

  it("skips words that are only symbols", () => {
    expect(getInitials("@ Acme")).toBe("A");
  });
});
