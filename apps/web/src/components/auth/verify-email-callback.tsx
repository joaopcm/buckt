"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { authClient } from "@/lib/auth-client";

const SLUG_WHITESPACE = /\s+/g;
const SLUG_NON_ALPHANUMERIC = /[^a-z0-9-]/g;

type Status = "loading" | "creating-org" | "success" | "error";

export function VerifyEmailCallback() {
  const router = useRouter();
  const [status, setStatus] = useState<Status>("loading");
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) {
      return;
    }
    ran.current = true;

    async function setup() {
      const session = await authClient.getSession();
      if (!session.data) {
        setStatus("error");
        return;
      }

      setStatus("creating-org");

      const pendingOrg = localStorage.getItem("buckt_pending_org");
      const orgName =
        pendingOrg || session.data.user.email.split("@")[0] || "My Org";

      const slug = orgName
        .toLowerCase()
        .replace(SLUG_WHITESPACE, "-")
        .replace(SLUG_NON_ALPHANUMERIC, "");

      await authClient.organization.create({ name: orgName, slug });
      localStorage.removeItem("buckt_pending_org");

      setStatus("success");
      router.push("/");
      router.refresh();
    }

    setup();
  }, [router]);

  if (status === "error") {
    return (
      <div className="space-y-8">
        <div className="space-y-2">
          <h1 className="font-bold text-2xl tracking-tight">Link expired</h1>
          <p className="text-muted-foreground text-sm">
            This verification link is invalid or has expired. Request a new one
            to verify your account.
          </p>
        </div>
        <p className="text-center text-muted-foreground text-sm">
          <Link
            className="font-medium text-foreground underline-offset-4 hover:underline"
            href="/verify-email"
          >
            Request new verification email
          </Link>
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <h1 className="font-bold text-2xl tracking-tight">
        {status === "creating-org"
          ? "Setting up your account..."
          : "Verifying your email..."}
      </h1>
      <p className="text-muted-foreground text-sm">
        Please wait while we get everything ready.
      </p>
    </div>
  );
}
