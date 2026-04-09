export const ORG_COOKIE_NAME = "buckt-last-org";
const MAX_AGE = 60 * 60 * 24 * 365;

export function setOrgCookie(orgId: string) {
  // biome-ignore lint/suspicious/noDocumentCookie: no alternative for setting cookies in browser
  document.cookie = `${ORG_COOKIE_NAME}=${orgId}; path=/; max-age=${MAX_AGE}`;
}
