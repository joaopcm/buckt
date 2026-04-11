export type ShortcutScope =
  | "global"
  | "buckets"
  | "bucket-detail"
  | "keys"
  | "key-detail"
  | "settings"
  | "billing";

export type ShortcutCategory = "navigation" | "action" | "contextual";

export interface ShortcutDefinition {
  category: ShortcutCategory;
  id: string;
  keys: string;
  label: string;
  scope: ShortcutScope;
}

export const shortcuts: ShortcutDefinition[] = [
  {
    id: "nav.dashboard",
    keys: "g>d",
    label: "Go to Dashboard",
    category: "navigation",
    scope: "global",
  },
  {
    id: "nav.buckets",
    keys: "g>b",
    label: "Go to Buckets",
    category: "navigation",
    scope: "global",
  },
  {
    id: "nav.keys",
    keys: "g>k",
    label: "Go to API Keys",
    category: "navigation",
    scope: "global",
  },
  {
    id: "nav.settings",
    keys: "g>s",
    label: "Go to Settings",
    category: "navigation",
    scope: "global",
  },
  {
    id: "nav.billing",
    keys: "g>i",
    label: "Go to Billing",
    category: "navigation",
    scope: "global",
  },
  {
    id: "nav.profile",
    keys: "g>p",
    label: "Go to Profile",
    category: "navigation",
    scope: "global",
  },
  {
    id: "action.toggle-sidebar",
    keys: "mod+b",
    label: "Toggle Sidebar",
    category: "action",
    scope: "global",
  },
  {
    id: "action.create",
    keys: "c",
    label: "Create New",
    category: "action",
    scope: "global",
  },
];

export function getShortcut(id: string): ShortcutDefinition {
  const shortcut = shortcuts.find((s) => s.id === id);
  if (!shortcut) {
    throw new Error(`Shortcut "${id}" not found in registry`);
  }
  return shortcut;
}

export function getShortcutsByScope(
  scope: ShortcutScope
): ShortcutDefinition[] {
  return shortcuts.filter((s) => s.scope === scope);
}

export function validateShortcuts(defs: ShortcutDefinition[]): void {
  const seen = new Map<string, string>();
  for (const def of defs) {
    const key = `${def.scope}::${def.keys}`;
    const existing = seen.get(key);
    if (existing) {
      throw new Error(
        `Duplicate shortcut key "${def.keys}" in scope "${def.scope}": "${existing}" and "${def.id}"`
      );
    }
    seen.set(key, def.id);
  }
}
