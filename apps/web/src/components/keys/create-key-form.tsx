"use client";

import type { PERMISSIONS } from "@buckt/shared";
import { AlertTriangle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { CopyText } from "@/components/copy-text";
import { PermissionSelect } from "@/components/keys/permission-select";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc/client";

export function CreateKeyForm({ orgId }: { orgId: string }) {
  const router = useRouter();
  const utils = trpc.useUtils();
  const [name, setName] = useState("");
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  const [secret, setSecret] = useState<string | null>(null);

  const createKey = trpc.keys.create.useMutation({
    onSuccess: (data) => {
      setSecret(data.key);
      utils.keys.list.invalidate({ orgId });
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  return (
    <>
      <Card className="max-w-lg">
        <CardHeader>
          <CardTitle>Key details</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              if (name.trim() && selectedPermissions.length > 0) {
                createKey.mutate({
                  orgId,
                  name: name.trim(),
                  permissions:
                    selectedPermissions as (typeof PERMISSIONS)[number][],
                });
              }
            }}
          >
            <div className="space-y-2">
              <Label htmlFor="key-name">Name</Label>
              <Input
                autoComplete="off"
                id="key-name"
                onChange={(e) => setName(e.target.value)}
                placeholder="My API key"
                value={name}
              />
            </div>

            <div className="space-y-2">
              <Label>Permissions</Label>
              <PermissionSelect
                onChange={setSelectedPermissions}
                value={selectedPermissions}
              />
              {selectedPermissions.length === 0 && (
                <p className="text-muted-foreground text-xs">
                  Select at least one permission
                </p>
              )}
            </div>

            <Button
              className="w-full"
              disabled={
                !name.trim() ||
                selectedPermissions.length === 0 ||
                createKey.isPending
              }
              type="submit"
            >
              {createKey.isPending ? "Creating..." : "Create key"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Dialog
        onOpenChange={(next) => {
          if (!next) {
            router.push(`/org/${orgId}/keys`);
          }
        }}
        open={!!secret}
      >
        <DialogContent showCloseButton={false}>
          <DialogTitle>API key created</DialogTitle>
          <DialogDescription>
            <span className="flex items-center gap-1.5">
              <AlertTriangle className="size-3.5 shrink-0 text-yellow-500" />
              Copy this key now. It won't be shown again.
            </span>
          </DialogDescription>
          <CopyText className="bg-muted p-2" value={secret ?? ""} />
          <DialogFooter>
            <Button onClick={() => router.push(`/org/${orgId}/keys`)}>
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
