import { describe, expect, it } from "vitest";
import {
  getShortcut,
  getShortcutsByScope,
  type ShortcutDefinition,
  shortcuts,
  validateShortcuts,
} from "./registry";

describe("shortcuts registry", () => {
  it("contains all expected navigation shortcuts", () => {
    const navIds = shortcuts
      .filter((s) => s.category === "navigation")
      .map((s) => s.id);

    expect(navIds).toContain("nav.dashboard");
    expect(navIds).toContain("nav.buckets");
    expect(navIds).toContain("nav.keys");
    expect(navIds).toContain("nav.aws-accounts");
    expect(navIds).toContain("nav.settings");
    expect(navIds).toContain("nav.billing");
    expect(navIds).toContain("nav.profile");
  });

  it("contains all expected action shortcuts", () => {
    const actionIds = shortcuts
      .filter((s) => s.category === "action")
      .map((s) => s.id);

    expect(actionIds).toContain("action.toggle-sidebar");
    expect(actionIds).toContain("action.create");
  });

  it("has unique ids", () => {
    const ids = shortcuts.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("getShortcut", () => {
  it("returns a shortcut by id", () => {
    const shortcut = getShortcut("nav.dashboard");
    expect(shortcut).toEqual({
      id: "nav.dashboard",
      keys: "g>d",
      label: "Go to Dashboard",
      category: "navigation",
      scope: "global",
    });
  });

  it("throws for unknown id", () => {
    expect(() => getShortcut("nonexistent")).toThrow(
      'Shortcut "nonexistent" not found in registry'
    );
  });
});

describe("getShortcutsByScope", () => {
  it("returns only shortcuts matching the given scope", () => {
    const global = getShortcutsByScope("global");
    expect(global.length).toBeGreaterThan(0);
    for (const s of global) {
      expect(s.scope).toBe("global");
    }
  });
});

describe("validateShortcuts", () => {
  it("passes for the default registry", () => {
    expect(() => validateShortcuts(shortcuts)).not.toThrow();
  });

  it("throws on duplicate keys within the same scope", () => {
    const dupes: ShortcutDefinition[] = [
      {
        id: "a",
        keys: "g>d",
        label: "A",
        category: "navigation",
        scope: "global",
      },
      {
        id: "b",
        keys: "g>d",
        label: "B",
        category: "navigation",
        scope: "global",
      },
    ];
    expect(() => validateShortcuts(dupes)).toThrow(
      'Duplicate shortcut key "g>d" in scope "global": "a" and "b"'
    );
  });

  it("allows same keys in different scopes", () => {
    const different: ShortcutDefinition[] = [
      {
        id: "a",
        keys: "e",
        label: "A",
        category: "contextual",
        scope: "global",
      },
      {
        id: "b",
        keys: "e",
        label: "B",
        category: "contextual",
        scope: "buckets",
      },
    ];
    expect(() => validateShortcuts(different)).not.toThrow();
  });
});
