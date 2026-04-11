"use client";

import { useEffect } from "react";
import { useHotkeysContext } from "react-hotkeys-hook";
import type { ShortcutScope } from "./registry";

export function useScope(scope: ShortcutScope) {
  const { enableScope, disableScope } = useHotkeysContext();

  useEffect(() => {
    enableScope(scope);
    return () => disableScope(scope);
  }, [scope, enableScope, disableScope]);
}
