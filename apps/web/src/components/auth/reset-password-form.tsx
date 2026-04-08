"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authClient } from "@/lib/auth-client";

const resetPasswordSchema = z
  .object({
    email: z.email("Enter a valid email"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

type ResetPasswordValues = z.infer<typeof resetPasswordSchema>;

export function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordValues>({
    resolver: zodResolver(resetPasswordSchema),
  });

  if (!token) {
    return (
      <div className="space-y-8">
        <div className="space-y-2">
          <h1 className="font-bold text-2xl tracking-tight">
            Invalid reset link
          </h1>
          <p className="text-muted-foreground text-sm">
            This password reset link is invalid or has expired.
          </p>
        </div>
        <p className="text-center text-muted-foreground text-sm">
          <Link
            className="font-medium text-foreground underline-offset-4 hover:underline"
            href="/forgot-password"
          >
            Request a new reset link
          </Link>
        </p>
      </div>
    );
  }

  async function onSubmit(values: ResetPasswordValues) {
    const { error } = await authClient.resetPassword({
      newPassword: values.password,
      token: token as string,
    });

    if (error) {
      toast.error(error.message ?? "Failed to reset password");
      return;
    }

    const { error: signInError } = await authClient.signIn.email({
      email: values.email,
      password: values.password,
    });

    if (signInError) {
      toast.success("Password reset successfully");
      router.push("/login");
      return;
    }

    router.push("/");
    router.refresh();
  }

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h1 className="font-bold text-2xl tracking-tight">
          Choose a new password
        </h1>
        <p className="text-muted-foreground text-sm">
          Enter your email and a new password below
        </p>
      </div>

      <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
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

        <div className="space-y-2">
          <Label htmlFor="password">New password</Label>
          <Input
            autoComplete="new-password"
            id="password"
            placeholder="&bull;&bull;&bull;&bull;&bull;&bull;&bull;&bull;"
            type="password"
            {...register("password")}
          />
          {errors.password && (
            <p className="text-destructive text-xs">
              {errors.password.message}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirmPassword">Confirm password</Label>
          <Input
            autoComplete="new-password"
            id="confirmPassword"
            placeholder="&bull;&bull;&bull;&bull;&bull;&bull;&bull;&bull;"
            type="password"
            {...register("confirmPassword")}
          />
          {errors.confirmPassword && (
            <p className="text-destructive text-xs">
              {errors.confirmPassword.message}
            </p>
          )}
        </div>

        <Button className="w-full" disabled={isSubmitting} type="submit">
          {isSubmitting ? "Resetting password..." : "Reset password"}
        </Button>
      </form>

      <p className="text-center text-muted-foreground text-sm">
        Remember your password?{" "}
        <Link
          className="font-medium text-foreground underline-offset-4 hover:underline"
          href="/login"
        >
          Sign in
        </Link>
      </p>
    </div>
  );
}
