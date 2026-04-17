import { sonare } from "sonare";

export const MANAGED_DOMAIN_SUFFIX = "buckt.dev";

export function generateManagedSubdomain(): string {
  return `${sonare({ minLength: 8, maxLength: 12 })}.${MANAGED_DOMAIN_SUFFIX}`;
}

export function isManagedHostname(hostname: string): boolean {
  return hostname.endsWith(`.${MANAGED_DOMAIN_SUFFIX}`);
}
