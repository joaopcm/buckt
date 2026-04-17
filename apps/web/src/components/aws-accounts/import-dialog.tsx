"use client";

import { Download, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
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
  const [selectedBuckets, setSelectedBuckets] = useState<Set<string>>(
    new Set()
  );
  const [cursor, setCursor] = useState<string | undefined>();

  const { data: accounts } = trpc.awsAccounts.list.useQuery({
    orgId,
    limit: 50,
  });

  const activeAccounts =
    accounts?.items.filter((a) => a.status === "active") ?? [];

  const { data: s3Buckets, isPending: bucketsLoading } =
    trpc.awsAccounts.listS3Buckets.useQuery(
      { orgId, id: selectedAccountId, limit: 20, cursor },
      { enabled: !!selectedAccountId }
    );

  const utils = trpc.useUtils();

  const importMutation = trpc.awsAccounts.importBuckets.useMutation({
    onSuccess: (data) => {
      toast.success(`Imported ${data.length} bucket(s)`);
      utils.buckets.list.invalidate();
      onOpenChange(false);
      setSelectedBuckets(new Set());
      setSelectedAccountId("");
    },
    onError: (err) => toast.error(err.message),
  });

  function toggleBucket(name: string) {
    setSelectedBuckets((prev) => {
      const next = new Set(prev);
      if (next.has(name)) {
        next.delete(name);
      } else {
        next.add(name);
      }
      return next;
    });
  }

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Import Buckets</DialogTitle>
          <DialogDescription>
            Select an AWS account and choose buckets to import
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <Select
            onValueChange={(v) => {
              setSelectedAccountId(v ?? "");
              setSelectedBuckets(new Set());
              setCursor(undefined);
            }}
            value={selectedAccountId}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select AWS account" />
            </SelectTrigger>
            <SelectContent>
              {activeAccounts.map((account) => (
                <SelectItem key={account.id} value={account.id}>
                  {account.label || account.awsAccountId}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {selectedAccountId && bucketsLoading && (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          )}

          {selectedAccountId && s3Buckets && (
            <>
              {s3Buckets.items.length === 0 ? (
                <p className="text-muted-foreground text-sm">
                  No buckets found in this account
                </p>
              ) : (
                <div className="max-h-64 space-y-1 overflow-y-auto">
                  {s3Buckets.items.map((bucket) => (
                    <button
                      className="flex w-full cursor-pointer items-center gap-3 rounded-md border p-3 text-left hover:bg-accent"
                      key={bucket.name}
                      onClick={() => toggleBucket(bucket.name)}
                      type="button"
                    >
                      <Checkbox
                        checked={selectedBuckets.has(bucket.name)}
                        onCheckedChange={() => toggleBucket(bucket.name)}
                      />
                      <div className="flex-1">
                        <p className="font-medium text-sm">{bucket.name}</p>
                        <p className="text-muted-foreground text-xs">
                          Created{" "}
                          {new Date(bucket.creationDate).toLocaleDateString()}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {s3Buckets.nextCursor && (
                <Button
                  className="w-full"
                  onClick={() => setCursor(s3Buckets.nextCursor ?? undefined)}
                  size="sm"
                  variant="outline"
                >
                  Load more
                </Button>
              )}

              <p className="text-muted-foreground text-xs">
                {s3Buckets.total} bucket(s) total &middot;{" "}
                {selectedBuckets.size} selected
              </p>
            </>
          )}
        </div>

        <DialogFooter>
          <Button onClick={() => onOpenChange(false)} variant="outline">
            Cancel
          </Button>
          <Button
            disabled={selectedBuckets.size === 0 || importMutation.isPending}
            onClick={() =>
              importMutation.mutate({
                orgId,
                id: selectedAccountId,
                bucketNames: [...selectedBuckets],
              })
            }
          >
            {importMutation.isPending ? (
              <>
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                Importing...
              </>
            ) : (
              <>
                <Download className="mr-1.5 h-4 w-4" />
                Import{" "}
                {selectedBuckets.size > 0 ? `(${selectedBuckets.size})` : ""}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
