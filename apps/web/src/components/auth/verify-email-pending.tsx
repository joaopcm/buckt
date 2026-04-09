"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authClient } from "@/lib/auth-client";

const COOLDOWN_SECONDS = 60;

const resendSchema = z.object({
  email: z.email("Enter a valid email"),
});

type ResendValues = z.infer<typeof resendSchema>;

export function VerifyEmailPending() {
  const searchParams = useSearchParams();
  const emailParam = searchParams.get("email");
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) {
      return;
    }
    const timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  const sendVerification = useCallback(
    async (email: string) => {
      if (cooldown > 0) {
        return;
      }
      const { error } = await authClient.sendVerificationEmail({
        email,
        callbackURL: "/verify-email/callback",
      });
      if (error) {
        toast.error(error.message ?? "Failed to send verification email");
        return;
      }
      setCooldown(COOLDOWN_SECONDS);
      toast.success("Verification email sent");
    },
    [cooldown]
  );

  if (emailParam) {
    return (
      <div className="space-y-8">
        <div className="space-y-2">
          <h1 className="font-bold text-2xl tracking-tight">
            Check your email
          </h1>
          <p className="text-muted-foreground text-sm">
            We sent a verification link to{" "}
            <span className="font-medium text-foreground">{emailParam}</span>.
            Click the link to verify your account.
          </p>
        </div>

        <Button
          className="w-full"
          disabled={cooldown > 0}
          onClick={() => sendVerification(emailParam)}
          variant="outline"
        >
          {cooldown > 0
            ? `Resend in ${cooldown}s`
            : "Resend verification email"}
        </Button>

        <p className="text-center text-muted-foreground text-sm">
          <Link
            className="font-medium text-foreground underline-offset-4 hover:underline"
            href="/login"
          >
            Back to sign in
          </Link>
        </p>
      </div>
    );
  }

  return <ResendForm cooldown={cooldown} onSubmit={sendVerification} />;
}

function buttonLabel(cooldown: number, isSubmitting: boolean) {
  if (cooldown > 0) {
    return `Resend in ${cooldown}s`;
  }
  if (isSubmitting) {
    return "Sending...";
  }
  return "Send verification email";
}

function ResendForm({
  onSubmit,
  cooldown,
}: {
  onSubmit: (email: string) => Promise<void>;
  cooldown: number;
}) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResendValues>({
    resolver: zodResolver(resendSchema),
  });

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h1 className="font-bold text-2xl tracking-tight">
          Resend verification email
        </h1>
        <p className="text-muted-foreground text-sm">
          Enter your email and we&apos;ll send a new verification link
        </p>
      </div>

      <form
        className="space-y-4"
        onSubmit={handleSubmit((values) => onSubmit(values.email))}
      >
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            autoComplete="email"
            id="email"
            placeholder="you@company.com"
            type="email"
            {...register("email")}
          />
          {errors.email && (
            <p className="text-destructive text-xs">{errors.email.message}</p>
          )}
        </div>

        <Button
          className="w-full"
          disabled={isSubmitting || cooldown > 0}
          type="submit"
        >
          {buttonLabel(cooldown, isSubmitting)}
        </Button>
      </form>

      <p className="text-center text-muted-foreground text-sm">
        <Link
          className="font-medium text-foreground underline-offset-4 hover:underline"
          href="/login"
        >
          Back to sign in
        </Link>
      </p>
    </div>
  );
}
