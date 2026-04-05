"use client";

import { ChevronRight, FileIcon, FolderIcon } from "lucide-react";

const TRAILING_SLASH = /\/$/;

import { useState } from "react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { CopyText } from "@/components/copy-text";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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

        {breadcrumbs.length > 0 && (
          <Breadcrumbs onNavigate={setPrefix} parts={breadcrumbs} />
        )}

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
          <TableHead>URL</TableHead>
          <TableHead className="w-10" />
        </TableRow>
      </TableHeader>
      <TableBody>
        {folders.map((folder) => {
          const name = folder.replace(prefix, "").replace(TRAILING_SLASH, "");
          return (
            <TableRow
              className="cursor-pointer"
              key={folder}
              onClick={() => onNavigate(folder)}
              onMouseEnter={() => onPrefetch(folder)}
            >
              <TableCell className="flex items-center gap-2 font-mono text-xs">
                <FolderIcon className="size-4 text-muted-foreground" />
                {name}
              </TableCell>
              <TableCell className="text-muted-foreground text-xs">—</TableCell>
              <TableCell className="text-muted-foreground text-xs">—</TableCell>
              <TableCell />
              <TableCell />
            </TableRow>
          );
        })}
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
      <TableCell className="flex items-center gap-2 font-mono text-xs">
        <FileIcon className="size-4 text-muted-foreground" />
        {fileName}
      </TableCell>
      <TableCell className="text-muted-foreground text-xs">
        {formatBytes(file.size)}
      </TableCell>
      <TableCell className="text-muted-foreground text-xs">
        {new Date(file.lastModified).toLocaleDateString()}
      </TableCell>
      <TableCell>
        <CopyText className="max-w-xs text-muted-foreground" value={url} />
      </TableCell>
      <TableCell>
        <Button
          onClick={() => setDeleteOpen(true)}
          size="icon-xs"
          variant="ghost"
        >
          <span className="text-destructive text-xs">Delete</span>
        </Button>

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
