"use client";

import {
  ChevronRight,
  FileIcon,
  FolderIcon,
  FolderPlus,
  MoreVertical,
  Search,
} from "lucide-react";
import { parseAsString, useQueryState } from "nuqs";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { DateDisplay } from "@/components/date-display";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { useCursorPagination } from "@/hooks/use-cursor-pagination";
import { useDebounce } from "@/hooks/use-debounce";
import { formatBytes } from "@/lib/format";
import { trpc } from "@/lib/trpc/client";
import { FileUpload } from "./file-upload";

const TRAILING_SLASH = /\/$/;
const DEFAULT_LIMIT = 50;

export function FileBrowser({
  orgId,
  bucketId,
  customDomain,
}: {
  orgId: string;
  bucketId: string;
  customDomain: string;
}) {
  const [prefix, setPrefix] = useQueryState(
    "fp",
    parseAsString.withDefault("")
  );
  const [search, setSearch] = useQueryState(
    "fq",
    parseAsString.withDefault("")
  );
  const debouncedSearch = useDebounce(search, 300);
  const pagination = useCursorPagination({
    defaultLimit: DEFAULT_LIMIT,
    cursorKey: "fc",
    limitKey: "fl",
  });
  const utils = trpc.useUtils();

  const prevSearchRef = useRef(debouncedSearch);
  if (prevSearchRef.current !== debouncedSearch) {
    prevSearchRef.current = debouncedSearch;
    pagination.resetPagination();
  }

  const searchPrefix = debouncedSearch
    ? `${prefix}${debouncedSearch}`
    : prefix || undefined;

  const { data, isPending } = trpc.files.list.useQuery({
    orgId,
    bucketId,
    prefix: searchPrefix,
    cursor: pagination.cursor,
    limit: pagination.limit,
  });

  function invalidateFiles() {
    utils.files.list.invalidate({ orgId, bucketId });
  }

  function prefetchFolder(folderPrefix: string) {
    utils.files.list.prefetch({ orgId, bucketId, prefix: folderPrefix });
  }

  function handleNavigate(newPrefix: string) {
    setPrefix(newPrefix);
    setSearch("");
    pagination.resetPagination();
  }

  const hasNextPage = !!data?.nextCursor;
  const breadcrumbs = prefix ? prefix.split("/").filter(Boolean) : [];
  const folders = data?.folders ?? [];
  const files = data?.files ?? [];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Files</CardTitle>
        <CardDescription>Manage files in this bucket</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Breadcrumbs onNavigate={handleNavigate} parts={breadcrumbs} />

        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-8"
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search files..."
              value={search}
            />
          </div>
          <CreateFolderButton
            bucketId={bucketId}
            onCreated={invalidateFiles}
            orgId={orgId}
            prefix={prefix}
          />
        </div>

        {isPending && (
          <div className="space-y-3">
            <div className="h-10 animate-pulse bg-muted" />
            <div className="h-10 animate-pulse bg-muted" />
            <div className="h-10 animate-pulse bg-muted" />
          </div>
        )}

        {!isPending && folders.length === 0 && files.length === 0 && (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <FileIcon className="mb-3 size-8 text-muted-foreground" />
            <p className="text-muted-foreground text-sm">
              <EmptyMessage prefix={prefix} search={debouncedSearch} />
            </p>
          </div>
        )}

        {!isPending && (folders.length > 0 || files.length > 0) && (
          <>
            <Table className="table-fixed">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50%]">Name</TableHead>
                  <TableHead className="w-[15%]">Size</TableHead>
                  <TableHead className="w-[25%]">Modified</TableHead>
                  <TableHead className="w-[10%]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {folders.map((folder) => (
                  <FolderRow
                    bucketId={bucketId}
                    folder={folder}
                    key={folder}
                    onDelete={invalidateFiles}
                    onNavigate={handleNavigate}
                    onPrefetch={prefetchFolder}
                    orgId={orgId}
                    prefix={prefix}
                  />
                ))}
                {files.map((file) => (
                  <FileRow
                    bucketId={bucketId}
                    customDomain={customDomain}
                    file={file}
                    key={file.key}
                    onDelete={invalidateFiles}
                    orgId={orgId}
                  />
                ))}
              </TableBody>
            </Table>

            {(pagination.hasPreviousPage || hasNextPage) && (
              <div className="flex items-center justify-end gap-2">
                <Button
                  disabled={!pagination.hasPreviousPage}
                  onClick={pagination.previousPage}
                  size="sm"
                  variant="outline"
                >
                  Previous
                </Button>
                <Button
                  disabled={!hasNextPage}
                  onClick={() =>
                    data?.nextCursor && pagination.nextPage(data.nextCursor)
                  }
                  size="sm"
                  variant="outline"
                >
                  Next
                </Button>
              </div>
            )}
          </>
        )}

        <FileUpload
          bucketId={bucketId}
          onUploadComplete={invalidateFiles}
          orgId={orgId}
          prefix={prefix}
        />
      </CardContent>
    </Card>
  );
}

function EmptyMessage({ search, prefix }: { search: string; prefix: string }) {
  if (search) {
    return "No files found";
  }
  if (prefix) {
    return "This folder is empty";
  }
  return "No files yet";
}

function CreateFolderButton({
  orgId,
  bucketId,
  prefix,
  onCreated,
}: {
  orgId: string;
  bucketId: string;
  prefix: string;
  onCreated: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");

  const createFolder = trpc.files.createFolder.useMutation({
    onSuccess: () => {
      toast.success("Folder created");
      setOpen(false);
      setName("");
      onCreated();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  return (
    <>
      <Button
        onClick={() => setOpen(true)}
        size="icon"
        title="New folder"
        variant="outline"
      >
        <FolderPlus className="size-4" />
      </Button>
      <Dialog
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) {
            setName("");
          }
        }}
        open={open}
      >
        <DialogContent>
          <DialogTitle>New folder</DialogTitle>
          <DialogDescription>
            {prefix ? (
              <>
                This folder will be created inside{" "}
                <strong className="text-foreground">{prefix}</strong>
              </>
            ) : (
              "This folder will be created in the root directory"
            )}
          </DialogDescription>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (name.trim()) {
                createFolder.mutate({
                  orgId,
                  bucketId,
                  key: `${prefix}${name.trim()}`,
                });
              }
            }}
          >
            <div className="space-y-2">
              <Label htmlFor="folder-name">Folder name</Label>
              <Input
                autoComplete="off"
                id="folder-name"
                onChange={(e) => setName(e.target.value)}
                placeholder="my-folder"
                value={name}
              />
            </div>
            <DialogFooter className="mt-4">
              <DialogClose render={<Button type="button" variant="outline" />}>
                Cancel
              </DialogClose>
              <Button
                disabled={!name.trim() || createFolder.isPending}
                type="submit"
              >
                {createFolder.isPending ? "Creating..." : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

function Breadcrumbs({
  parts,
  onNavigate,
}: {
  parts: string[];
  onNavigate: (prefix: string) => void;
}) {
  return (
    <nav className="flex items-center gap-1 text-xs">
      <button
        className="cursor-pointer text-muted-foreground hover:text-foreground"
        onClick={() => onNavigate("")}
        type="button"
      >
        Root
      </button>
      {parts.map((part, i) => {
        const path = `${parts.slice(0, i + 1).join("/")}/`;
        const isLast = i === parts.length - 1;
        return (
          <span className="flex items-center gap-1" key={path}>
            <ChevronRight className="size-3 text-muted-foreground" />
            {isLast ? (
              <span className="font-medium">{part}</span>
            ) : (
              <button
                className="cursor-pointer text-muted-foreground hover:text-foreground"
                onClick={() => onNavigate(path)}
                type="button"
              >
                {part}
              </button>
            )}
          </span>
        );
      })}
    </nav>
  );
}

function FolderRow({
  orgId,
  bucketId,
  folder,
  prefix,
  onNavigate,
  onPrefetch,
  onDelete,
}: {
  orgId: string;
  bucketId: string;
  folder: string;
  prefix: string;
  onNavigate: (prefix: string) => void;
  onPrefetch: (prefix: string) => void;
  onDelete: () => void;
}) {
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [renameOpen, setRenameOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const name = folder.replace(prefix, "").replace(TRAILING_SLASH, "");

  const deleteFolder = trpc.files.deleteFolder.useMutation({
    onSuccess: (data) => {
      toast.success(`Deleted ${data.deleted} file(s)`);
      setDeleteOpen(false);
      onDelete();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const renameFolder = trpc.files.renameFolder.useMutation({
    onSuccess: (data) => {
      toast.success(`Renamed to ${data.newPrefix}`);
      setRenameOpen(false);
      setNewName("");
      onDelete();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  return (
    <TableRow
      className="h-10 cursor-pointer"
      key={folder}
      onMouseEnter={() => onPrefetch(folder)}
    >
      <TableCell
        className="truncate font-mono text-xs"
        onClick={() => onNavigate(folder)}
      >
        <div className="flex items-center gap-2">
          <FolderIcon className="size-4 shrink-0 text-muted-foreground" />
          <span className="truncate hover:underline">{name}</span>
        </div>
      </TableCell>
      <TableCell className="text-muted-foreground text-xs">—</TableCell>
      <TableCell className="text-muted-foreground text-xs">—</TableCell>
      <TableCell>
        <DropdownMenu>
          <DropdownMenuTrigger className="flex size-7 cursor-pointer items-center justify-center text-muted-foreground hover:bg-foreground/10 hover:text-foreground">
            <MoreVertical className="size-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" side="bottom">
            <DropdownMenuItem onClick={() => onNavigate(folder)}>
              Open folder
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => {
                setNewName(name);
                setRenameOpen(true);
              }}
            >
              Rename folder
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => setDeleteOpen(true)}
              variant="destructive"
            >
              Delete folder
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <Dialog
          onOpenChange={(next) => {
            setRenameOpen(next);
            if (!next) {
              setNewName("");
            }
          }}
          open={renameOpen}
        >
          <DialogContent>
            <DialogTitle>Rename folder</DialogTitle>
            <DialogDescription>
              Rename <strong className="text-foreground">{name}</strong> — all
              files inside will be moved to the new location.
            </DialogDescription>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (newName.trim() && newName.trim() !== name) {
                  renameFolder.mutate({
                    orgId,
                    bucketId,
                    oldPrefix: folder,
                    newPrefix: `${prefix}${newName.trim()}`,
                  });
                }
              }}
            >
              <div className="space-y-2">
                <Label htmlFor="rename-folder">New name</Label>
                <Input
                  autoComplete="off"
                  id="rename-folder"
                  onChange={(e) => setNewName(e.target.value)}
                  value={newName}
                />
              </div>
              <DialogFooter className="mt-4">
                <DialogClose
                  render={<Button type="button" variant="outline" />}
                >
                  Cancel
                </DialogClose>
                <Button
                  disabled={
                    !newName.trim() ||
                    newName.trim() === name ||
                    renameFolder.isPending
                  }
                  type="submit"
                >
                  {renameFolder.isPending ? "Renaming..." : "Rename"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        <ConfirmDialog
          confirmLabel="Delete"
          confirmValue={name}
          description={
            <>
              This will permanently delete the folder <strong>{name}</strong>{" "}
              and all its contents. This action cannot be undone.
            </>
          }
          destructive
          loading={deleteFolder.isPending}
          onConfirm={() =>
            deleteFolder.mutate({ orgId, bucketId, prefix: folder })
          }
          onOpenChange={setDeleteOpen}
          open={deleteOpen}
          title="Delete folder"
        />
      </TableCell>
    </TableRow>
  );
}

function FileRow({
  orgId,
  bucketId,
  customDomain,
  file,
  onDelete,
}: {
  orgId: string;
  bucketId: string;
  customDomain: string;
  file: { key: string; size: number; lastModified: string };
  onDelete: () => void;
}) {
  const [deleteOpen, setDeleteOpen] = useState(false);
  const url = `https://${customDomain}/${file.key}`;
  const fileName = file.key.split("/").pop() ?? file.key;

  const deleteFile = trpc.files.delete.useMutation({
    onSuccess: () => {
      toast.success("File deleted");
      setDeleteOpen(false);
      onDelete();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  return (
    <TableRow>
      <TableCell className="truncate font-mono text-xs">
        <div className="flex items-center gap-2">
          <FileIcon className="size-4 shrink-0 text-muted-foreground" />
          <span className="truncate">{fileName}</span>
        </div>
      </TableCell>
      <TableCell className="text-muted-foreground text-xs">
        {formatBytes(file.size)}
      </TableCell>
      <TableCell>
        <DateDisplay
          className="text-muted-foreground text-xs"
          date={file.lastModified}
        />
      </TableCell>
      <TableCell>
        <DropdownMenu>
          <DropdownMenuTrigger className="flex size-7 cursor-pointer items-center justify-center text-muted-foreground hover:bg-foreground/10 hover:text-foreground">
            <MoreVertical className="size-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" side="bottom">
            <DropdownMenuItem
              onClick={() => {
                navigator.clipboard.writeText(url);
                toast.success("URL copied");
              }}
            >
              Copy URL
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => setDeleteOpen(true)}
              variant="destructive"
            >
              Delete file
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <ConfirmDialog
          confirmLabel="Delete"
          confirmValue={fileName}
          description="This file will be permanently deleted. This action cannot be undone."
          destructive
          loading={deleteFile.isPending}
          onConfirm={() =>
            deleteFile.mutate({ orgId, bucketId, key: file.key })
          }
          onOpenChange={setDeleteOpen}
          open={deleteOpen}
          title="Delete file"
        />
      </TableCell>
    </TableRow>
  );
}
