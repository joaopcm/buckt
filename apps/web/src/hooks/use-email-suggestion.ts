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
  memberEmails: string[],
  existingEmails: string[]
): string | null {
  const trimmed = currentToken.trim().toLowerCase();
  if (trimmed.length === 0) {
    return null;
  }

  const existing = new Set(existingEmails.map((e) => e.toLowerCase()));

  for (const email of memberEmails) {
    const lower = email.toLowerCase();
    if (
      lower.startsWith(trimmed) &&
      lower !== trimmed &&
      !existing.has(lower)
    ) {
      return email.slice(trimmed.length);
    }
  }

  const atIndex = trimmed.indexOf("@");
  if (atIndex === -1) {
    return null;
  }

  const domainFragment = trimmed.slice(atIndex + 1);
  if (domainFragment.length === 0) {
    return null;
  }

  for (const domain of COMMON_DOMAINS) {
    if (domain.startsWith(domainFragment) && domain !== domainFragment) {
      return domain.slice(domainFragment.length);
    }
  }

  return null;
}

export function useEmailSuggestion(
  currentToken: string,
  memberEmails: string[],
  existingEmails: string[]
): string | null {
  return useMemo(
    () => getSuggestion(currentToken, memberEmails, existingEmails),
    [currentToken, memberEmails, existingEmails]
  );
}

export { getSuggestion };
