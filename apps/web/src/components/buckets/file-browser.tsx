"use client";

import { ChevronRight, FileIcon, FolderIcon, MoreVertical } from "lucide-react";

const TRAILING_SLASH = /\/$/;

import { useState } from "react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { DateDisplay } from "@/components/date-display";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { formatBytes } from "@/lib/format";
import { trpc } from "@/lib/trpc/client";
import { FileUpload } from "./file-upload";

export function FileBrowser({
  orgId,
  bucketId,
  customDomain,
}: {
  orgId: string;
  bucketId: string;
  customDomain: string;
}) {
  const [prefix, setPrefix] = useState("");
  const { data, isPending } = trpc.files.list.useQuery({
    orgId,
    bucketId,
    prefix: prefix || undefined,
  });
  const utils = trpc.useUtils();

  function invalidateFiles() {
    utils.files.list.invalidate({ orgId, bucketId });
  }

  function prefetchFolder(folderPrefix: string) {
    utils.files.list.prefetch({ orgId, bucketId, prefix: folderPrefix });
  }

  const breadcrumbs = prefix ? prefix.split("/").filter(Boolean) : [];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Files</CardTitle>
        <CardDescription>Manage files in this bucket</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <FileUpload
          bucketId={bucketId}
          onUploadComplete={invalidateFiles}
          orgId={orgId}
          prefix={prefix}
        />

        <Breadcrumbs onNavigate={setPrefix} parts={breadcrumbs} />

        {isPending ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div className="h-10 animate-pulse bg-muted" key={i} />
            ))}
          </div>
        ) : (
          <FileTable
            bucketId={bucketId}
            customDomain={customDomain}
            files={data?.files ?? []}
            folders={data?.folders ?? []}
            onDelete={invalidateFiles}
            onNavigate={setPrefix}
            onPrefetch={prefetchFolder}
            orgId={orgId}
            prefix={prefix}
          />
        )}
      </CardContent>
    </Card>
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

function FileTable({
  orgId,
  bucketId,
  customDomain,
  folders,
  files,
  prefix,
  onNavigate,
  onPrefetch,
  onDelete,
}: {
  orgId: string;
  bucketId: string;
  customDomain: string;
  folders: string[];
  files: { key: string; size: number; lastModified: string }[];
  prefix: string;
  onNavigate: (prefix: string) => void;
  onPrefetch: (prefix: string) => void;
  onDelete: () => void;
}) {
  if (folders.length === 0 && files.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <FileIcon className="mb-3 size-8 text-muted-foreground" />
        <p className="text-muted-foreground text-sm">
          {prefix ? "This folder is empty" : "No files yet"}
        </p>
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Size</TableHead>
          <TableHead>Modified</TableHead>
          <TableHead className="w-10" />
        </TableRow>
      </TableHeader>
      <TableBody>
        {folders.map((folder) => (
          <FolderRow
            bucketId={bucketId}
            folder={folder}
            key={folder}
            onDelete={onDelete}
            onNavigate={onNavigate}
            onPrefetch={onPrefetch}
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
            onDelete={onDelete}
            orgId={orgId}
          />
        ))}
      </TableBody>
    </Table>
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

  return (
    <TableRow
      className="h-10 cursor-pointer"
      key={folder}
      onMouseEnter={() => onPrefetch(folder)}
    >
      <TableCell
        className="font-mono text-xs"
        onClick={() => onNavigate(folder)}
      >
        <div className="flex items-center gap-2">
          <FolderIcon className="size-4 text-muted-foreground" />
          {name}
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
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => setDeleteOpen(true)}
              variant="destructive"
            >
              Delete folder
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

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
      <TableCell className="font-mono text-xs">
        <div className="flex items-center gap-2">
          <FileIcon className="size-4 text-muted-foreground" />
          {fileName}
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
