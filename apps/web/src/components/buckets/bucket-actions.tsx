"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { RenameBucketDialog } from "@/components/buckets/rename-bucket-dialog";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc/client";

interface BucketActionsProps {
  bucket: {
    id: string;
    name: string;
    status: string;
  };
  orgId: string;
}

export function BucketActions({ orgId, bucket }: BucketActionsProps) {
  const router = useRouter();
  const [renameOpen, setRenameOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const utils = trpc.useUtils();

  const deleteBucket = trpc.buckets.delete.useMutation({
    onSuccess: () => {
      utils.buckets.list.invalidate({ orgId });
      toast.success("Bucket deletion started");
      router.push(`/org/${orgId}/buckets`);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const retryBucket = trpc.buckets.retry.useMutation({
    onSuccess: () => {
      utils.buckets.get.invalidate({ orgId, id: bucket.id });
      toast.success("Provisioning retried");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  return (
    <div className="flex items-center gap-2">
      <Button onClick={() => setRenameOpen(true)} variant="outline">
        Rename
      </Button>
      {bucket.status === "failed" && (
        <Button
          disabled={retryBucket.isPending}
          onClick={() => retryBucket.mutate({ orgId, id: bucket.id })}
          variant="outline"
        >
          {retryBucket.isPending ? "Retrying..." : "Retry"}
        </Button>
      )}
      <Button
        disabled={bucket.status === "deleting"}
        onClick={() => setDeleteOpen(true)}
        variant="destructive"
      >
        Delete
      </Button>

      <RenameBucketDialog
        bucket={bucket}
        onOpenChange={setRenameOpen}
        open={renameOpen}
        orgId={orgId}
      />

      <ConfirmDialog
        confirmLabel="Delete"
        confirmValue={bucket.name}
        description={
          <>
            This will destroy all files, the S3 bucket, CloudFront distribution,
            and SSL certificate. This action cannot be undone.
          </>
        }
        destructive
        loading={deleteBucket.isPending}
        onConfirm={() => deleteBucket.mutate({ orgId, id: bucket.id })}
        onOpenChange={setDeleteOpen}
        open={deleteOpen}
        title="Delete"
      />
    </div>
  );
}
