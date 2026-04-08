"use client";

import { createOrgSchema } from "@buckt/shared";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import type { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authClient } from "@/lib/auth-client";
import { setOrgCookie } from "@/lib/org-cookie";

const SLUG_WHITESPACE = /\s+/g;
const SLUG_NON_ALPHANUMERIC = /[^a-z0-9-]/g;

type CreateOrgValues = z.infer<typeof createOrgSchema>;

export function CreateOrgDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateOrgValues>({
    resolver: zodResolver(createOrgSchema),
  });

  async function onSubmit(values: CreateOrgValues) {
    const slug = values.name
      .toLowerCase()
      .replace(SLUG_WHITESPACE, "-")
      .replace(SLUG_NON_ALPHANUMERIC, "");

    const { data, error } = await authClient.organization.create({
      name: values.name,
      slug,
    });

    if (error) {
      toast.error(error.message ?? "Failed to create organization");
      return;
    }

    setOrgCookie(data.id);
    reset();
    onOpenChange(false);
    router.push(`/org/${data.id}/dashboard`);
    router.refresh();
  }

  return (
    <Dialog
      onOpenChange={(next) => {
        if (!next) {
          reset();
        }
        onOpenChange(next);
      }}
      open={open}
    >
      <DialogContent>
        <DialogTitle>Create organization</DialogTitle>
        <DialogDescription>
          Add a new organization to manage your buckets and team.
        </DialogDescription>
        <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
          <div className="space-y-2">
            <Label htmlFor="org-name">Name</Label>
            <Input
              id="org-name"
              placeholder="Acme Corp"
              {...register("name")}
            />
            {errors.name && (
              <p className="text-destructive text-xs">{errors.name.message}</p>
            )}
          </div>
          <DialogFooter>
            <DialogClose render={<Button type="button" variant="outline" />}>
              Cancel
            </DialogClose>
            <Button disabled={isSubmitting} type="submit">
              {isSubmitting ? "Creating..." : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
