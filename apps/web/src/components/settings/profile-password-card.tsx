"use client";

import { changePasswordSchema } from "@buckt/shared";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import type { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authClient } from "@/lib/auth-client";

type PasswordValues = z.infer<typeof changePasswordSchema>;

export function ProfilePasswordCard() {
  const {
    register,
    handleSubmit,
    formState: { errors, isDirty, isSubmitting },
    reset,
  } = useForm<PasswordValues>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  async function onSubmit(values: PasswordValues) {
    const { error } = await authClient.changePassword({
      currentPassword: values.currentPassword,
      newPassword: values.newPassword,
      revokeOtherSessions: false,
    });
    if (error) {
      toast.error(error.message ?? "Failed to change password");
      return;
    }
    toast.success("Password changed");
    reset();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Password</CardTitle>
        <CardDescription>Update your account password</CardDescription>
      </CardHeader>
      <CardContent>
        <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
          <div className="space-y-2">
            <Label htmlFor="current-password">Current password</Label>
            <Input
              autoComplete="current-password"
              id="current-password"
              type="password"
              {...register("currentPassword")}
            />
            {errors.currentPassword && (
              <p className="text-destructive text-xs">
                {errors.currentPassword.message}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="new-password">New password</Label>
            <Input
              autoComplete="new-password"
              id="new-password"
              type="password"
              {...register("newPassword")}
            />
            {errors.newPassword && (
              <p className="text-destructive text-xs">
                {errors.newPassword.message}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm-password">Confirm new password</Label>
            <Input
              autoComplete="new-password"
              id="confirm-password"
              type="password"
              {...register("confirmPassword")}
            />
            {errors.confirmPassword && (
              <p className="text-destructive text-xs">
                {errors.confirmPassword.message}
              </p>
            )}
          </div>
          <Button disabled={!isDirty || isSubmitting} type="submit">
            {isSubmitting ? "Changing..." : "Change password"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
