"use client";

import { Upload, X } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { trpc } from "@/lib/trpc/client";

const WHITESPACE = /\s+/;
const NON_ALPHANUMERIC = /[^a-zA-Z0-9]/;
const MAX_FILE_SIZE = 2 * 1024 * 1024;
const ACCEPTED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/svg+xml",
]);

function getInitials(name: string) {
  return name
    .split(WHITESPACE)
    .map((w) => w.replace(NON_ALPHANUMERIC, "").charAt(0))
    .filter(Boolean)
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

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

export function OrgLogoCard({
  orgId,
  org,
  isAdmin,
}: {
  orgId: string;
  org: { name: string; logo: string | null } | null | undefined;
  isAdmin: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const utils = trpc.useUtils();

  const updateLogo = trpc.org.updateLogo.useMutation({
    onSuccess: () => {
      toast.success("Logo updated");
      utils.org.get.invalidate({ orgId });
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const removeLogo = trpc.org.removeLogo.useMutation({
    onSuccess: () => {
      toast.success("Logo removed");
      utils.org.get.invalidate({ orgId });
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) {
      return;
    }

    if (!ACCEPTED_TYPES.has(file.type)) {
      toast.error("Unsupported image format");
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      toast.error("Image must be under 2MB");
      return;
    }

    setUploading(true);
    try {
      const image = await fileToBase64(file);
      await updateLogo.mutateAsync({
        orgId,
        image,
        contentType: file.type as
          | "image/jpeg"
          | "image/png"
          | "image/webp"
          | "image/gif"
          | "image/svg+xml",
      });
    } finally {
      setUploading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Logo</CardTitle>
        <CardDescription>
          Your organization&apos;s logo appears in the sidebar and across the
          app
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-4">
          <Avatar className="size-16 text-lg">
            <AvatarImage src={org?.logo ?? undefined} />
            <AvatarFallback>{org ? getInitials(org.name) : "?"}</AvatarFallback>
          </Avatar>
          {isAdmin && (
            <div className="flex gap-2">
              <Button
                disabled={uploading || removeLogo.isPending}
                onClick={() => inputRef.current?.click()}
                size="sm"
                variant="outline"
              >
                <Upload className="mr-1 size-4" />
                {uploading ? "Uploading..." : "Upload"}
              </Button>
              {org?.logo && (
                <Button
                  disabled={uploading || removeLogo.isPending}
                  onClick={() => removeLogo.mutate({ orgId })}
                  size="sm"
                  variant="outline"
                >
                  <X className="mr-1 size-4" />
                  {removeLogo.isPending ? "Removing..." : "Remove"}
                </Button>
              )}
              <input
                accept="image/jpeg,image/png,image/webp,image/gif,image/svg+xml"
                className="hidden"
                onChange={handleFileChange}
                ref={inputRef}
                type="file"
              />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
