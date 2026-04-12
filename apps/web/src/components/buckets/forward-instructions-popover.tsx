"use client";

import { forwardInstructionsSchema } from "@buckt/shared";
import { Mail } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { EmailAutocompleteTextarea } from "@/components/ui/email-autocomplete-textarea";
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover";
import { trpc } from "@/lib/trpc/client";

function storageKey(bucketId: string) {
  return `forward-dns-emails:${bucketId}`;
}

const EMAIL_SEPARATOR = /[,\n]/;

function parseEmails(raw: string): string[] {
  return raw
    .split(EMAIL_SEPARATOR)
    .map((s) => s.trim())
    .filter(Boolean);
}

interface ForwardInstructionsPopoverProps {
  bucketId: string;
  memberEmails: string[];
  orgId: string;
  serviceId: "acm-validation" | "cdn-cname";
}

export function ForwardInstructionsPopover({
  orgId,
  bucketId,
  serviceId,
  memberEmails,
}: ForwardInstructionsPopoverProps) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");

  useEffect(() => {
    if (open) {
      const saved = localStorage.getItem(storageKey(bucketId));
      setValue(saved ?? "");
    } else {
      setValue("");
    }
  }, [open, bucketId]);

  const forward = trpc.buckets.forwardInstructions.useMutation({
    onSuccess: ({ sent }) => {
      toast.success(
        `Instructions sent to ${sent} recipient${sent > 1 ? "s" : ""}`
      );
      localStorage.setItem(storageKey(bucketId), value);
      setOpen(false);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleSubmit = useCallback(() => {
    const emails = parseEmails(value);
    const result = forwardInstructionsSchema.safeParse({
      emails,
      bucketId,
      serviceId,
    });

    if (!result.success) {
      const firstError = result.error.issues[0];
      toast.error(firstError?.message ?? "Invalid input");
      return;
    }

    forward.mutate({ ...result.data, orgId });
  }, [value, bucketId, serviceId, orgId, forward]);

  return (
    <Popover onOpenChange={setOpen} open={open}>
      <PopoverTrigger render={<Button size="sm" variant="outline" />}>
        <Mail className="mr-1.5 size-3" />
        Forward instructions
      </PopoverTrigger>
      <PopoverContent align="start" className="w-80">
        <PopoverHeader>
          <PopoverTitle>Forward DNS instructions</PopoverTitle>
          <PopoverDescription>
            Send setup instructions by email.
          </PopoverDescription>
        </PopoverHeader>
        <div className="space-y-3 pt-3">
          <EmailAutocompleteTextarea
            className="h-24"
            memberEmails={memberEmails}
            onChange={setValue}
            onSubmit={handleSubmit}
            placeholder="Enter email addresses..."
            value={value}
          />
          <p className="text-muted-foreground text-xs">
            Tab to accept · Comma to separate
          </p>
          <div className="flex justify-end">
            <Button
              disabled={forward.isPending || value.trim().length === 0}
              onClick={handleSubmit}
              size="sm"
            >
              {forward.isPending ? "Sending..." : "Send"}
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
