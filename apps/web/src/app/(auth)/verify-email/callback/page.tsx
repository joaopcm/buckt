import type { Metadata } from "next";
import { Suspense } from "react";
import { VerifyEmailCallback } from "@/components/auth/verify-email-callback";

export const metadata: Metadata = { title: "Verify email" };

export default function VerifyEmailCallbackPage() {
  return (
    <Suspense>
      <VerifyEmailCallback />
    </Suspense>
  );
}
