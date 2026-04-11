"use client";

import { useEffect } from "react";
import { HotkeysProvider } from "react-hotkeys-hook";
import { shortcuts, validateShortcuts } from "./registry";

function ShortcutValidator() {
  useEffect(() => {
    if (process.env.NODE_ENV === "development") {
      validateShortcuts(shortcuts);
    }
  }, []);
  return null;
}

export function ShortcutProvider({ children }: { children: React.ReactNode }) {
  return (
    <HotkeysProvider initiallyActiveScopes={["global"]}>
      <ShortcutValidator />
      {children}
    </HotkeysProvider>
  );
}
