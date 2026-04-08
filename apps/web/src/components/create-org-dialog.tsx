"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
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

export function CreateOrgDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [isPending, setIsPending] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      return;
    }

    setIsPending(true);
    const slug = name
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-]/g, "");

    const { data, error } = await authClient.organization.create({
      name: name.trim(),
      slug,
    });

    setIsPending(false);

    if (error) {
      toast.error(error.message ?? "Failed to create organization");
      return;
    }

    setOrgCookie(data.id);
    setName("");
    onOpenChange(false);
    router.push(`/org/${data.id}/dashboard`);
    router.refresh();
  }

  return (
    <Dialog
      onOpenChange={(next) => {
        if (!next) {
          setName("");
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
        <form className="space-y-4" onSubmit={onSubmit}>
          <div className="space-y-2">
            <Label htmlFor="org-name">Name</Label>
            <Input
              id="org-name"
              onChange={(e) => setName(e.target.value)}
              placeholder="Acme Corp"
              value={name}
            />
          </div>
          <DialogFooter>
            <DialogClose render={<Button type="button" variant="outline" />}>
              Cancel
            </DialogClose>
            <Button disabled={isPending || !name.trim()} type="submit">
              {isPending ? "Creating..." : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
