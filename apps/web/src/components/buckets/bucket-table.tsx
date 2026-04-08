"use client";

import { HardDrive, MoreVertical, Search } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { parseAsString, useQueryState } from "nuqs";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { RenameBucketDialog } from "@/components/buckets/rename-bucket-dialog";
import { StatusBadge } from "@/components/buckets/status-badge";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { CopyText } from "@/components/copy-text";
import { DateDisplay } from "@/components/date-display";
import { Pagination } from "@/components/pagination";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useCursorPagination } from "@/hooks/use-cursor-pagination";
import { useDebounce } from "@/hooks/use-debounce";
import { formatBytes } from "@/lib/format";
import { getRegion } from "@/lib/regions";
import { trpc } from "@/lib/trpc/client";

export function BucketTable({ orgId }: { orgId: string }) {
  const [search, setSearch] = useQueryState("q", parseAsString.withDefault(""));
  const debouncedSearch = useDebounce(search, 300);
  const pagination = useCursorPagination();
  const utils = trpc.useUtils();

  const { data, isPending } = trpc.buckets.list.useQuery({
    orgId,
    cursor: pagination.cursor,
    limit: pagination.limit,
    search: debouncedSearch || undefined,
  });

  const prevSearchRef = useRef(debouncedSearch);
  if (prevSearchRef.current !== debouncedSearch) {
    prevSearchRef.current = debouncedSearch;
    pagination.resetPagination();
  }

  function prefetchBucket(bucketId: string) {
    utils.buckets.get.prefetch({ orgId, id: bucketId });
    utils.files.list.prefetch({ orgId, bucketId });
  }

  const start = pagination.pageIndex * pagination.limit + 1;
  const end = Math.min(start + (data?.items.length ?? 0) - 1, data?.total ?? 0);

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="pl-8"
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search buckets..."
          value={search}
        />
      </div>

      {isPending && (
        <div className="space-y-3">
          <div className="h-12 animate-pulse bg-muted" />
          <div className="h-12 animate-pulse bg-muted" />
          <div className="h-12 animate-pulse bg-muted" />
        </div>
      )}

      {!(isPending || data?.items.length) && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <HardDrive className="mb-4 size-10 text-muted-foreground" />
          <h2 className="font-medium text-lg">
            {debouncedSearch ? "No buckets found" : "No buckets yet"}
          </h2>
          <p className="mt-1 text-muted-foreground text-sm">
            {debouncedSearch
              ? "Try a different search term"
              : "Create your first bucket to get started"}
          </p>
        </div>
      )}

      {!isPending && data?.items.length ? (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Domain</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Region</TableHead>
                <TableHead>Storage</TableHead>
                <TableHead>Bandwidth</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.items.map((bucket) => (
                <TableRow
                  key={bucket.id}
                  onMouseEnter={() => prefetchBucket(bucket.id)}
                >
                  <TableCell>
                    <Link
                      className="font-medium hover:underline"
                      href={`/org/${orgId}/buckets/${bucket.id}`}
                    >
                      {bucket.name}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <CopyText
                      className="text-muted-foreground"
                      value={bucket.customDomain}
                    />
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={bucket.status} />
                  </TableCell>
                  <TableCell>
                    <RegionCell region={bucket.region} />
                  </TableCell>
                  <TableCell className="text-muted-foreground text-xs">
                    {formatBytes(bucket.storageUsedBytes ?? 0)}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-xs">
                    {formatBytes(bucket.bandwidthUsedBytes ?? 0)}
                  </TableCell>
                  <TableCell>
                    <DateDisplay
                      className="text-muted-foreground text-xs"
                      date={bucket.createdAt}
                    />
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

          <Pagination
            end={end}
            hasNextPage={!!data.nextCursor}
            hasPreviousPage={pagination.hasPreviousPage}
            limit={pagination.limit}
            onLimitChange={pagination.setLimit}
            onNextPage={() =>
              data.nextCursor && pagination.nextPage(data.nextCursor)
            }
            onPreviousPage={pagination.previousPage}
            start={start}
            total={data.total}
          />
        </>
      ) : null}
    </div>
  );
}

function RegionCell({ region }: { region: string }) {
  const r = getRegion(region);
  if (!r) {
    return <span className="text-muted-foreground text-xs">{region}</span>;
  }
  return (
    <span className="flex items-center gap-1.5 text-xs">
      <r.Flag className="size-4 shrink-0" />
      <span className="text-muted-foreground">{r.label}</span>
    </span>
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
  const router = useRouter();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [renameOpen, setRenameOpen] = useState(false);
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
    <>
      <DropdownMenu>
        <DropdownMenuTrigger className="flex size-7 cursor-pointer items-center justify-center text-muted-foreground hover:bg-foreground/10 hover:text-foreground">
          <MoreVertical className="size-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" side="bottom">
          <DropdownMenuItem
            onClick={() => router.push(`/org/${orgId}/buckets/${bucketId}`)}
          >
            View details
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setRenameOpen(true)}>
            Rename
          </DropdownMenuItem>
          {status === "failed" && (
            <DropdownMenuItem
              disabled={retryBucket.isPending}
              onClick={() => retryBucket.mutate({ orgId, id: bucketId })}
            >
              Retry provisioning
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            disabled={status === "deleting"}
            onClick={() => setDeleteOpen(true)}
            variant="destructive"
          >
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <RenameBucketDialog
        bucket={{ id: bucketId, name: bucketName }}
        onOpenChange={setRenameOpen}
        open={renameOpen}
        orgId={orgId}
      />

      <ConfirmDialog
        confirmLabel="Delete"
        confirmValue={bucketName}
        description={
          <>
            This will destroy all files, the S3 bucket, CloudFront distribution,
            and SSL certificate. This action cannot be undone.
          </>
        }
        destructive
        loading={deleteBucket.isPending}
        onConfirm={() => deleteBucket.mutate({ orgId, id: bucketId })}
        onOpenChange={setDeleteOpen}
        open={deleteOpen}
        title="Delete"
      />
    </>
  );
}
