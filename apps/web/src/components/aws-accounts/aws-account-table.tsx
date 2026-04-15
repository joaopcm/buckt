"use client";

import { Cloud, MoreVertical, RefreshCw, Search } from "lucide-react";
import { parseAsString, useQueryState } from "nuqs";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { DateDisplay } from "@/components/date-display";
import { Pagination } from "@/components/pagination";
import { Badge } from "@/components/ui/badge";
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
import { trpc } from "@/lib/trpc/client";

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  pending: {
    label: "Pending",
    className: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
  },
  validating: {
    label: "Validating",
    className: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  },
  active: {
    label: "Active",
    className: "bg-green-500/10 text-green-500 border-green-500/20",
  },
  failed: {
    label: "Failed",
    className: "bg-red-500/10 text-red-500 border-red-500/20",
  },
};

export function AwsAccountTable({ orgId }: { orgId: string }) {
  const [search, setSearch] = useQueryState("q", parseAsString.withDefault(""));
  const debouncedSearch = useDebounce(search, 300);
  const pagination = useCursorPagination();
  const { data, isPending } = trpc.awsAccounts.list.useQuery({
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

  const start = pagination.pageIndex * pagination.limit + 1;
  const end = Math.min(start + (data?.items.length ?? 0) - 1, data?.total ?? 0);

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="pl-8"
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search accounts..."
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
          <Cloud className="mb-4 size-10 text-muted-foreground" />
          <h2 className="font-medium text-lg">
            {debouncedSearch ? "No accounts found" : "No AWS accounts yet"}
          </h2>
          <p className="mt-1 text-muted-foreground text-sm">
            {debouncedSearch
              ? "Try a different search term"
              : "Connect an AWS account to get started"}
          </p>
        </div>
      )}

      {!isPending && data?.items.length ? (
        <>
          <Table className="table-fixed">
            <TableHeader>
              <TableRow>
                <TableHead className="w-[30%]">Label</TableHead>
                <TableHead className="w-[20%]">Account ID</TableHead>
                <TableHead className="w-[15%]">Status</TableHead>
                <TableHead className="w-[20%]">Connected</TableHead>
                <TableHead className="w-[5%]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.items.map((account) => {
                const status =
                  STATUS_CONFIG[account.status] ?? STATUS_CONFIG.pending;
                return (
                  <TableRow key={account.id}>
                    <TableCell className="truncate font-medium text-xs">
                      {account.label || account.awsAccountId || "Pending setup"}
                    </TableCell>
                    <TableCell className="font-mono text-muted-foreground text-xs">
                      {account.awsAccountId.startsWith("pending-")
                        ? "—"
                        : account.awsAccountId}
                    </TableCell>
                    <TableCell>
                      <Badge className={status.className} variant="outline">
                        {status.label}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <DateDisplay
                        className="text-muted-foreground text-xs"
                        date={account.createdAt}
                      />
                    </TableCell>
                    <TableCell>
                      <AccountActions
                        accountId={account.id}
                        accountLabel={account.label ?? account.awsAccountId}
                        accountStatus={account.status}
                        orgId={orgId}
                      />
                    </TableCell>
                  </TableRow>
                );
              })}
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

function AccountActions({
  orgId,
  accountId,
  accountLabel,
  accountStatus,
}: {
  orgId: string;
  accountId: string;
  accountLabel: string;
  accountStatus: string;
}) {
  const [disconnectOpen, setDisconnectOpen] = useState(false);
  const utils = trpc.useUtils();

  const validateMutation = trpc.awsAccounts.validate.useMutation({
    onSuccess: () => {
      utils.awsAccounts.list.invalidate({ orgId });
      toast.success("AWS account validated");
    },
    onError: (err) => toast.error(err.message),
  });

  const disconnectMutation = trpc.awsAccounts.disconnect.useMutation({
    onSuccess: () => {
      utils.awsAccounts.list.invalidate({ orgId });
      utils.buckets.list.invalidate();
      toast.success("AWS account disconnected");
      setDisconnectOpen(false);
    },
    onError: (err) => toast.error(err.message),
  });

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger className="flex size-7 cursor-pointer items-center justify-center text-muted-foreground hover:bg-foreground/10 hover:text-foreground">
          <MoreVertical className="size-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" side="bottom">
          {(accountStatus === "pending" || accountStatus === "failed") && (
            <DropdownMenuItem
              disabled={validateMutation.isPending}
              onClick={() => validateMutation.mutate({ orgId, id: accountId })}
            >
              <RefreshCw className="mr-2 size-3.5" />
              Validate
            </DropdownMenuItem>
          )}
          {(accountStatus === "pending" || accountStatus === "failed") && (
            <DropdownMenuSeparator />
          )}
          <DropdownMenuItem
            onClick={() => setDisconnectOpen(true)}
            variant="destructive"
          >
            Disconnect
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <ConfirmDialog
        confirmLabel="Disconnect"
        confirmValue={accountLabel}
        description="All buckets managed through this AWS account will be removed from Buckt. Your AWS resources will not be affected."
        destructive
        loading={disconnectMutation.isPending}
        onConfirm={() => disconnectMutation.mutate({ orgId, id: accountId })}
        onOpenChange={setDisconnectOpen}
        open={disconnectOpen}
        title="Disconnect AWS account"
      />
    </>
  );
}
