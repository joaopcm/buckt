"use client";

import { Loader2, Search } from "lucide-react";
import { parseAsString, useQueryState } from "nuqs";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { DateDisplay } from "@/components/date-display";
import { Pagination } from "@/components/pagination";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { trpc } from "@/lib/trpc/client";

export function ImportBucketsDialog({
  orgId,
  open,
  onOpenChange,
}: {
  orgId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [selectedAccountId, setSelectedAccountId] = useState<string>("");
  const [imported, setImported] = useState<Set<string>>(new Set());
  const [search, setSearch] = useQueryState(
    "import-q",
    parseAsString.withDefault("")
  );
  const debouncedSearch = useDebounce(search, 300);
  const pagination = useCursorPagination({
    cursorKey: "import-cursor",
    limitKey: "import-limit",
  });

  const { data: accounts } = trpc.awsAccounts.list.useQuery({
    orgId,
    limit: 50,
  });

  const activeAccounts =
    accounts?.items.filter((a) => a.status === "active") ?? [];

  const { data: s3Buckets, isPending: bucketsLoading } =
    trpc.awsAccounts.listS3Buckets.useQuery(
      {
        orgId,
        id: selectedAccountId,
        limit: pagination.limit,
        cursor: pagination.cursor,
        search: debouncedSearch || undefined,
      },
      { enabled: !!selectedAccountId }
    );

  const prevSearchRef = useRef(debouncedSearch);
  if (prevSearchRef.current !== debouncedSearch) {
    prevSearchRef.current = debouncedSearch;
    pagination.resetPagination();
  }

  const utils = trpc.useUtils();

  const importMutation = trpc.awsAccounts.importBuckets.useMutation({
    onSuccess: (data, variables) => {
      toast.success(`Imported ${data.length} bucket(s)`);
      utils.buckets.list.invalidate();
      setImported((prev) => {
        const next = new Set(prev);
        for (const name of variables.bucketNames) {
          next.add(name);
        }
        return next;
      });
    },
    onError: (err) => toast.error(err.message),
  });

  const pendingBucket = importMutation.isPending
    ? importMutation.variables?.bucketNames[0]
    : null;

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) {
      setSelectedAccountId("");
      setImported(new Set());
      setSearch(null);
      pagination.resetPagination();
    }
    onOpenChange(nextOpen);
  }

  const start = pagination.pageIndex * pagination.limit + 1;
  const end = Math.min(
    start + (s3Buckets?.items.length ?? 0) - 1,
    s3Buckets?.total ?? 0
  );

  return (
    <Dialog onOpenChange={handleOpenChange} open={open}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Import buckets</DialogTitle>
          <DialogDescription>
            Select an AWS account and import existing S3 buckets
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>AWS Account</Label>
            <Select
              items={activeAccounts.map((a) => ({
                value: a.id,
                label: a.label || a.awsAccountId,
              }))}
              onValueChange={(v) => {
                setSelectedAccountId(v ?? "");
                setSearch(null);
                pagination.resetPagination();
              }}
              value={selectedAccountId}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select AWS account" />
              </SelectTrigger>
              <SelectContent align="start" alignItemWithTrigger={false}>
                {activeAccounts.map((account) => (
                  <SelectItem key={account.id} value={account.id}>
                    {account.label || account.awsAccountId}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedAccountId && (
            <>
              <div className="relative">
                <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="pl-8"
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search buckets..."
                  value={search}
                />
              </div>

              {bucketsLoading && (
                <div className="space-y-3">
                  <div className="h-12 animate-pulse bg-muted" />
                  <div className="h-12 animate-pulse bg-muted" />
                  <div className="h-12 animate-pulse bg-muted" />
                </div>
              )}

              {!bucketsLoading && s3Buckets?.items.length === 0 && (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <h2 className="font-medium text-sm">
                    {debouncedSearch ? "No buckets found" : "No buckets"}
                  </h2>
                  <p className="mt-1 text-muted-foreground text-xs">
                    {debouncedSearch
                      ? "Try a different search term"
                      : "This account has no S3 buckets"}
                  </p>
                </div>
              )}

              {!bucketsLoading && s3Buckets && s3Buckets.items.length > 0 && (
                <>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Created</TableHead>
                        <TableHead className="w-24" />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {s3Buckets.items.map((bucket) => (
                        <TableRow key={bucket.name}>
                          <TableCell className="font-medium">
                            {bucket.name}
                          </TableCell>
                          <TableCell>
                            <DateDisplay
                              className="text-muted-foreground text-xs"
                              date={bucket.creationDate}
                            />
                          </TableCell>
                          <TableCell className="text-right">
                            <ImportRowButton
                              disabled={importMutation.isPending}
                              isImported={imported.has(bucket.name)}
                              isPending={pendingBucket === bucket.name}
                              onImport={() =>
                                importMutation.mutate({
                                  orgId,
                                  id: selectedAccountId,
                                  bucketNames: [bucket.name],
                                })
                              }
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>

                  <Pagination
                    end={end}
                    hasNextPage={!!s3Buckets.nextCursor}
                    hasPreviousPage={pagination.hasPreviousPage}
                    limit={pagination.limit}
                    onLimitChange={pagination.setLimit}
                    onNextPage={() =>
                      s3Buckets.nextCursor &&
                      pagination.nextPage(s3Buckets.nextCursor)
                    }
                    onPreviousPage={pagination.previousPage}
                    start={start}
                    total={s3Buckets.total}
                  />
                </>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ImportRowButton({
  disabled,
  isImported,
  isPending,
  onImport,
}: {
  disabled: boolean;
  isImported: boolean;
  isPending: boolean;
  onImport: () => void;
}) {
  if (isPending) {
    return (
      <Button disabled size="sm" variant="outline">
        <Loader2 className="mr-1.5 size-3.5 animate-spin" />
        Importing
      </Button>
    );
  }

  if (isImported) {
    return (
      <Button disabled size="sm" variant="outline">
        Imported
      </Button>
    );
  }

  return (
    <Button disabled={disabled} onClick={onImport} size="sm" variant="outline">
      Import
    </Button>
  );
}
