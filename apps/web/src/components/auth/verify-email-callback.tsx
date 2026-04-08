"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { authClient } from "@/lib/auth-client";

const SLUG_WHITESPACE = /\s+/g;
const SLUG_NON_ALPHANUMERIC = /[^a-z0-9-]/g;

type Status = "verifying" | "creating-org" | "success" | "error";

export function VerifyEmailCallback() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<Status>("verifying");
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) {
      return;
    }
    ran.current = true;

    async function verify() {
      const token = searchParams.get("token");
      if (!token) {
        setStatus("error");
        return;
      }

      const { error } = await authClient.verifyEmail({ query: { token } });
      if (error) {
        setStatus("error");
        return;
      }

      setStatus("creating-org");

      const pendingOrg = localStorage.getItem("buckt_pending_org");
      const session = await authClient.getSession();
      const orgName =
        pendingOrg || session.data?.user.email.split("@")[0] || "My Org";

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

    verify();
  }, [searchParams, router]);

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
