import { useMemo } from "react";

const COMMON_DOMAINS = [
  "gmail.com",
  "outlook.com",
  "icloud.com",
  "yahoo.com",
  "hotmail.com",
  "protonmail.com",
];

function getSuggestion(
  currentToken: string,
  memberEmails: string[]
): string | null {
  const trimmed = currentToken.trim().toLowerCase();
  if (trimmed.length === 0) return null;

  for (const email of memberEmails) {
    if (email.toLowerCase().startsWith(trimmed) && email.toLowerCase() !== trimmed) {
      return email.slice(trimmed.length);
    }
  }

  const atIndex = trimmed.indexOf("@");
  if (atIndex === -1) return null;

  const domainFragment = trimmed.slice(atIndex + 1);
  if (domainFragment.length === 0) return null;

  for (const domain of COMMON_DOMAINS) {
    if (domain.startsWith(domainFragment) && domain !== domainFragment) {
      return domain.slice(domainFragment.length);
    }
  }

  return null;
}

export function useEmailSuggestion(
  currentToken: string,
  memberEmails: string[]
): string | null {
  return useMemo(
    () => getSuggestion(currentToken, memberEmails),
    [currentToken, memberEmails]
  );
}

export { getSuggestion };
