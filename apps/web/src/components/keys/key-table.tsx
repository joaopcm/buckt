"use client";

import { Key, MoreVertical, Search } from "lucide-react";
import { parseAsString, useQueryState } from "nuqs";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { DateDisplay } from "@/components/date-display";
import { BucketSelect } from "@/components/keys/bucket-select";
import { PermissionSelect } from "@/components/keys/permission-select";
import { Pagination } from "@/components/pagination";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useCursorPagination } from "@/hooks/use-cursor-pagination";
import { useDebounce } from "@/hooks/use-debounce";
import { trpc } from "@/lib/trpc/client";

export function KeyTable({ orgId }: { orgId: string }) {
  const [search, setSearch] = useQueryState("q", parseAsString.withDefault(""));
  const debouncedSearch = useDebounce(search, 300);
  const pagination = useCursorPagination();
  const { data, isPending } = trpc.keys.list.useQuery({
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
          placeholder="Search keys..."
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
          <Key className="mb-4 size-10 text-muted-foreground" />
          <h2 className="font-medium text-lg">
            {debouncedSearch ? "No keys found" : "No API keys yet"}
          </h2>
          <p className="mt-1 text-muted-foreground text-sm">
            {debouncedSearch
              ? "Try a different search term"
              : "Create an API key to get started"}
          </p>
        </div>
      )}

      {!isPending && data?.items.length ? (
        <>
          <Table className="table-fixed">
            <TableHeader>
              <TableRow>
                <TableHead className="w-[25%]">Name</TableHead>
                <TableHead className="w-[12%]">Prefix</TableHead>
                <TableHead className="w-[28%]">Permissions</TableHead>
                <TableHead className="w-[15%]">Last used</TableHead>
                <TableHead className="w-[15%]">Created</TableHead>
                <TableHead className="w-[5%]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.items.map((apiKey) => (
                <TableRow key={apiKey.id}>
                  <TableCell className="truncate font-medium text-xs">
                    {apiKey.name}
                  </TableCell>
                  <TableCell className="font-mono text-muted-foreground text-xs">
                    {apiKey.prefix}...
                  </TableCell>
                  <TableCell>
                    <PermissionBadges
                      permissions={apiKey.permissions as string[]}
                    />
                  </TableCell>
                  <TableCell>
                    {apiKey.lastUsedAt ? (
                      <DateDisplay
                        className="text-muted-foreground text-xs"
                        date={apiKey.lastUsedAt}
                      />
                    ) : (
                      <span className="text-muted-foreground/60 text-xs">
                        Never
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    <DateDisplay
                      className="text-muted-foreground text-xs"
                      date={apiKey.createdAt}
                    />
                  </TableCell>
                  <TableCell>
                    <KeyActions
                      keyBucketIds={apiKey.bucketIds as string[] | null}
                      keyId={apiKey.id}
                      keyName={apiKey.name}
                      keyPermissions={apiKey.permissions as string[]}
                      orgId={orgId}
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

const MAX_VISIBLE_PERMISSIONS = 2;

function PermissionBadges({ permissions }: { permissions: string[] }) {
  const visible = permissions.slice(0, MAX_VISIBLE_PERMISSIONS);
  const remaining = permissions.length - MAX_VISIBLE_PERMISSIONS;

  return (
    <div className="flex items-center gap-1">
      {visible.map((perm) => (
        <Badge className="font-mono text-[10px]" key={perm} variant="outline">
          {perm}
        </Badge>
      ))}
      {remaining > 0 && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger
              className="cursor-default font-mono text-[10px] text-muted-foreground"
              render={<span />}
            >
              +{remaining} more
            </TooltipTrigger>
            <TooltipContent>
              <div className="flex flex-wrap gap-1">
                {permissions.map((perm) => (
                  <Badge
                    className="border-background/30 font-mono text-[10px] text-background"
                    key={perm}
                    variant="outline"
                  >
                    {perm}
                  </Badge>
                ))}
              </div>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
    </div>
  );
}

function KeyActions({
  orgId,
  keyId,
  keyName,
  keyPermissions,
  keyBucketIds,
}: {
  orgId: string;
  keyId: string;
  keyName: string;
  keyPermissions: string[];
  keyBucketIds: string[] | null;
}) {
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editName, setEditName] = useState(keyName);
  const [editPermissions, setEditPermissions] = useState(keyPermissions);
  const [editBucketIds, setEditBucketIds] = useState<string[] | null>(
    keyBucketIds
  );
  const utils = trpc.useUtils();

  const deleteKey = trpc.keys.delete.useMutation({
    onSuccess: () => {
      utils.keys.list.invalidate({ orgId });
      toast.success("API key deleted");
      setDeleteOpen(false);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const updateKey = trpc.keys.update.useMutation({
    onSuccess: () => {
      utils.keys.list.invalidate({ orgId });
      toast.success("API key updated");
      setEditOpen(false);
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
            onClick={() => {
              setEditName(keyName);
              setEditPermissions(keyPermissions);
              setEditBucketIds(keyBucketIds);
              setEditOpen(true);
            }}
          >
            Edit key
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => setDeleteOpen(true)}
            variant="destructive"
          >
            Delete key
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog
        onOpenChange={(next) => {
          setEditOpen(next);
          if (!next) {
            setEditName(keyName);
            setEditPermissions(keyPermissions);
            setEditBucketIds(keyBucketIds);
          }
        }}
        open={editOpen}
      >
        <DialogContent>
          <DialogTitle>Edit API key</DialogTitle>
          <DialogDescription>Update the name or permissions.</DialogDescription>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (editName.trim() && editPermissions.length > 0) {
                updateKey.mutate({
                  orgId,
                  id: keyId,
                  name: editName.trim(),
                  permissions: editPermissions,
                  bucketIds: editBucketIds,
                });
              }
            }}
          >
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="edit-key-name">Name</Label>
                <Input
                  autoComplete="off"
                  id="edit-key-name"
                  onChange={(e) => setEditName(e.target.value)}
                  value={editName}
                />
              </div>
              <div className="space-y-2">
                <Label>Permissions</Label>
                <PermissionSelect
                  onChange={setEditPermissions}
                  value={editPermissions}
                />
              </div>
              <div className="space-y-2">
                <Label>Bucket scope</Label>
                <BucketSelect
                  onChange={setEditBucketIds}
                  orgId={orgId}
                  value={editBucketIds}
                />
              </div>
            </div>
            <DialogFooter className="mt-4">
              <DialogClose render={<Button type="button" variant="outline" />}>
                Cancel
              </DialogClose>
              <Button
                disabled={
                  !editName.trim() ||
                  editPermissions.length === 0 ||
                  updateKey.isPending
                }
                type="submit"
              >
                {updateKey.isPending ? "Saving..." : "Save"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        confirmLabel="Delete"
        confirmValue={keyName}
        description="This API key will be permanently revoked. Any applications using it will lose access immediately."
        destructive
        loading={deleteKey.isPending}
        onConfirm={() => deleteKey.mutate({ orgId, id: keyId })}
        onOpenChange={setDeleteOpen}
        open={deleteOpen}
        title="Delete API key"
      />
    </>
  );
}
