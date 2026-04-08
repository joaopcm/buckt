import type { Metadata } from "next";
import { Suspense } from "react";
import { VerifyEmailPending } from "@/components/auth/verify-email-pending";

export const metadata: Metadata = { title: "Verify email" };

export default function VerifyEmailPage() {
  return (
    <Suspense>
      <VerifyEmailPending />
    </Suspense>
  );
}
