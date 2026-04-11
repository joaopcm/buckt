"use client";

import { useHotkeys } from "react-hotkeys-hook";
import { getShortcut } from "./registry";

interface ShortcutInfo {
  keys: string;
  label: string;
}

export function useShortcut(
  id: string,
  handler: (event: KeyboardEvent) => void
): ShortcutInfo {
  const shortcut = getShortcut(id);

  useHotkeys(
    shortcut.keys,
    (event) => {
      handler(event);
    },
    {
      scopes: [shortcut.scope],
      preventDefault: true,
    }
  );

  return { keys: shortcut.keys, label: shortcut.label };
}
