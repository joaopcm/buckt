"use client";

import { Upload } from "lucide-react";
import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc/client";

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(",")[1]);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function FileUpload({
  orgId,
  bucketId,
  onUploadComplete,
  prefix = "",
}: {
  orgId: string;
  bucketId: string;
  onUploadComplete: () => void;
  prefix?: string;
}) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const uploadFile = trpc.files.upload.useMutation({
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleFiles = useCallback(
    async (files: FileList | File[]) => {
      setUploading(true);
      try {
        for (const file of files) {
          const data = await fileToBase64(file);
          await uploadFile.mutateAsync({
            orgId,
            bucketId,
            key: `${prefix}${file.name}`,
            contentType: file.type || "application/octet-stream",
            data,
          });
        }
        toast.success(
          files.length === 1
            ? "File uploaded"
            : `${files.length} files uploaded`
        );
        onUploadComplete();
      } finally {
        setUploading(false);
      }
    },
    [orgId, bucketId, prefix, uploadFile, onUploadComplete]
  );

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(true);
  }

  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files.length > 0) {
      handleFiles(Array.from(e.dataTransfer.files));
    }
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(Array.from(e.target.files));
      e.target.value = "";
    }
  }

  return (
    <button
      className={`flex w-full cursor-pointer flex-col items-center justify-center border border-dashed p-8 transition-colors ${
        isDragging
          ? "border-foreground/30 bg-foreground/5"
          : "border-border hover:border-foreground/20"
      }`}
      onClick={() => inputRef.current?.click()}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      type="button"
    >
      <Upload className="mb-2 size-6 text-muted-foreground" />
      <p className="text-muted-foreground text-sm">
        {uploading
          ? "Uploading..."
          : "Drag and drop files here, or click to browse"}
      </p>
      <input
        className="hidden"
        multiple
        onChange={handleInputChange}
        ref={inputRef}
        type="file"
      />
    </button>
  );
}
