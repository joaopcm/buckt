// biome-ignore lint/performance/noBarrelFile: intentional barrel re-export
export { ShortcutProvider } from "./provider";
export type {
  ShortcutCategory,
  ShortcutDefinition,
  ShortcutScope,
} from "./registry";
export {
  getShortcut,
  getShortcutsByScope,
  shortcuts,
  validateShortcuts,
} from "./registry";
export { useScope } from "./use-scope";
export { useShortcut } from "./use-shortcut";
