"use client";

import { PERMISSIONS } from "@buckt/shared";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertTriangle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
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

const createKeyFormSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  permissions: z
    .array(z.enum(PERMISSIONS))
    .min(1, "Select at least one permission"),
});

type CreateKeyValues = z.infer<typeof createKeyFormSchema>;

export function CreateKeyForm({ orgId }: { orgId: string }) {
  const router = useRouter();
  const utils = trpc.useUtils();
  const [secret, setSecret] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<CreateKeyValues>({
    resolver: zodResolver(createKeyFormSchema),
    defaultValues: { name: "", permissions: [] },
  });

  const createKey = trpc.keys.create.useMutation({
    onSuccess: (data) => {
      setSecret(data.key);
      utils.keys.list.invalidate({ orgId });
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  function onSubmit(values: CreateKeyValues) {
    createKey.mutate({ ...values, orgId });
  }

  return (
    <>
      <Card className="max-w-lg">
        <CardHeader>
          <CardTitle>Key details</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
            <div className="space-y-2">
              <Label htmlFor="key-name">Name</Label>
              <Input
                autoComplete="off"
                id="key-name"
                placeholder="My API key"
                {...register("name")}
              />
              {errors.name && (
                <p className="text-destructive text-xs">
                  {errors.name.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Permissions</Label>
              <Controller
                control={control}
                name="permissions"
                render={({ field }) => (
                  <PermissionSelect
                    onChange={field.onChange}
                    value={field.value}
                  />
                )}
              />
              {errors.permissions && (
                <p className="text-destructive text-xs">
                  {errors.permissions.message}
                </p>
              )}
            </div>

            <Button
              className="w-full"
              disabled={createKey.isPending}
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
