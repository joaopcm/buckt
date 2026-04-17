"use client";

import { useParams, usePathname, useRouter } from "next/navigation";
import { useShortcut } from "./use-shortcut";

export function GlobalShortcuts() {
  const router = useRouter();
  const params = useParams<{ orgId: string }>();
  const pathname = usePathname();

  const navigate = (path: string) => {
    router.push(`/org/${params.orgId}${path}`);
  };

  useShortcut("nav.dashboard", () => navigate("/dashboard"));
  useShortcut("nav.buckets", () => navigate("/buckets"));
  useShortcut("nav.keys", () => navigate("/keys"));
  useShortcut("nav.aws-accounts", () => navigate("/aws-accounts"));
  useShortcut("nav.settings", () => navigate("/settings"));
  useShortcut("nav.billing", () => navigate("/billing"));
  useShortcut("nav.profile", () => navigate("/profile"));

  useShortcut("action.create", () => {
    const segments = pathname.split("/");
    const currentSection = segments.at(-1);

    if (currentSection === "buckets") {
      navigate("/buckets/new");
    } else if (currentSection === "keys") {
      navigate("/keys/new");
    }
  });

  return null;
}
