"use client";

import {
  Eye,
  HardDrive,
  MoreHorizontal,
  RefreshCw,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { StatusBadge } from "@/components/buckets/status-badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { trpc } from "@/lib/trpc/client";

export function BucketTable({ orgId }: { orgId: string }) {
  const { data, isPending } = trpc.buckets.list.useQuery({ orgId });

  if (isPending) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div className="h-12 animate-pulse bg-muted" key={i} />
        ))}
      </div>
    );
  }

  if (!data?.items.length) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <HardDrive className="mb-4 size-10 text-muted-foreground" />
        <h2 className="font-medium text-lg">No buckets yet</h2>
        <p className="mt-1 text-muted-foreground text-sm">
          Create your first bucket to get started
        </p>
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Domain</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Created</TableHead>
          <TableHead className="w-10" />
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.items.map((bucket) => (
          <TableRow key={bucket.id}>
            <TableCell>
              <Link
                className="font-medium hover:underline"
                href={`/org/${orgId}/buckets/${bucket.id}`}
              >
                {bucket.name}
              </Link>
            </TableCell>
            <TableCell className="font-mono text-muted-foreground text-xs">
              {bucket.customDomain}
            </TableCell>
            <TableCell>
              <StatusBadge status={bucket.status} />
            </TableCell>
            <TableCell className="text-muted-foreground text-xs">
              {new Date(bucket.createdAt).toLocaleDateString()}
            </TableCell>
            <TableCell>
              <BucketActions
                bucketId={bucket.id}
                bucketName={bucket.name}
                orgId={orgId}
                status={bucket.status}
              />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function BucketActions({
  orgId,
  bucketId,
  bucketName,
  status,
}: {
  orgId: string;
  bucketId: string;
  bucketName: string;
  status: string;
}) {
  const [deleteOpen, setDeleteOpen] = useState(false);
  const utils = trpc.useUtils();

  const deleteBucket = trpc.buckets.delete.useMutation({
    onSuccess: () => {
      utils.buckets.list.invalidate({ orgId });
      utils.buckets.count.invalidate({ orgId });
      toast.success("Bucket deletion started");
      setDeleteOpen(false);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const retryBucket = trpc.buckets.retry.useMutation({
    onSuccess: () => {
      utils.buckets.list.invalidate({ orgId });
      toast.success("Bucket provisioning retried");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  return (
    <Dialog onOpenChange={setDeleteOpen} open={deleteOpen}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button size="icon-xs" variant="ghost">
            <MoreHorizontal className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem asChild>
            <Link href={`/org/${orgId}/buckets/${bucketId}`}>
              <Eye className="size-4" />
              View details
            </Link>
          </DropdownMenuItem>
          {status === "failed" && (
            <DropdownMenuItem
              disabled={retryBucket.isPending}
              onClick={() => retryBucket.mutate({ orgId, id: bucketId })}
            >
              <RefreshCw className="size-4" />
              Retry provisioning
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          <DialogTrigger asChild>
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              disabled={status === "deleting"}
            >
              <Trash2 className="size-4" />
              Delete bucket
            </DropdownMenuItem>
          </DialogTrigger>
        </DropdownMenuContent>
      </DropdownMenu>

      <DialogContent>
        <DialogTitle>Delete bucket</DialogTitle>
        <DialogDescription>
          Are you sure you want to delete <strong>{bucketName}</strong>? This
          will destroy all files, the S3 bucket, CloudFront distribution, and
          SSL certificate. This action cannot be undone.
        </DialogDescription>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <Button
            disabled={deleteBucket.isPending}
            onClick={() => deleteBucket.mutate({ orgId, id: bucketId })}
            variant="destructive"
          >
            {deleteBucket.isPending ? "Deleting..." : "Delete"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
