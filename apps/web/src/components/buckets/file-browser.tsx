"use client";

import { FileIcon } from "lucide-react";
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
  const { data, isPending } = trpc.files.list.useQuery({ orgId, bucketId });
  const utils = trpc.useUtils();

  function invalidateFiles() {
    utils.files.list.invalidate({ orgId, bucketId });
  }

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
        />

        <FileList
          bucketId={bucketId}
          customDomain={customDomain}
          files={data?.files}
          isPending={isPending}
          onDelete={invalidateFiles}
          orgId={orgId}
        />
      </CardContent>
    </Card>
  );
}

function FileList({
  orgId,
  bucketId,
  customDomain,
  files,
  isPending,
  onDelete,
}: {
  orgId: string;
  bucketId: string;
  customDomain: string;
  files?: { key: string; size: number; lastModified: string }[];
  isPending: boolean;
  onDelete: () => void;
}) {
  if (isPending) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div className="h-10 animate-pulse bg-muted" key={i} />
        ))}
      </div>
    );
  }

  if (!files?.length) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <FileIcon className="mb-3 size-8 text-muted-foreground" />
        <p className="text-muted-foreground text-sm">No files yet</p>
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
      <TableCell className="font-mono text-xs">{file.key}</TableCell>
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
          confirmValue={file.key}
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
