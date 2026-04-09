const WHITESPACE = /\s+/;
const NON_ALPHANUMERIC = /[^a-zA-Z0-9]/;

export function getInitials(name: string) {
  return name
    .split(WHITESPACE)
    .map((w) => w.replace(NON_ALPHANUMERIC, "").charAt(0))
    .filter(Boolean)
    .join("")
    .toUpperCase()
    .slice(0, 2);
}
