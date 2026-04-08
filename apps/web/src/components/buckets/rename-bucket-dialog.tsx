"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
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
import { trpc } from "@/lib/trpc/client";

const renameSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
});

type RenameValues = z.infer<typeof renameSchema>;

export function RenameBucketDialog({
  open,
  onOpenChange,
  orgId,
  bucket,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orgId: string;
  bucket: { id: string; name: string };
}) {
  const utils = trpc.useUtils();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<RenameValues>({
    resolver: zodResolver(renameSchema),
    defaultValues: { name: bucket.name },
  });

  useEffect(() => {
    if (open) {
      reset({ name: bucket.name });
    }
  }, [open, bucket.name, reset]);

  const renameBucket = trpc.buckets.rename.useMutation({
    onSuccess: () => {
      utils.buckets.get.invalidate({ orgId, id: bucket.id });
      utils.buckets.list.invalidate({ orgId });
      toast.success("Bucket renamed");
      onOpenChange(false);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  function onSubmit(values: RenameValues) {
    renameBucket.mutate({ orgId, id: bucket.id, name: values.name });
  }

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent>
        <DialogTitle>Rename</DialogTitle>
        <DialogDescription>
          Change the display name for this bucket.
        </DialogDescription>
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="space-y-2">
            <Label htmlFor="bucket-name">Name</Label>
            <Input autoComplete="off" id="bucket-name" {...register("name")} />
            {errors.name && (
              <p className="text-destructive text-xs">{errors.name.message}</p>
            )}
          </div>
          <DialogFooter className="mt-4">
            <DialogClose render={<Button type="button" variant="outline" />}>
              Cancel
            </DialogClose>
            <Button disabled={renameBucket.isPending} type="submit">
              {renameBucket.isPending ? "Renaming..." : "Rename"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
