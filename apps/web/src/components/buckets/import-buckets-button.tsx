"use client";

import { useState } from "react";
import { ImportBucketsDialog } from "@/components/aws-accounts/import-dialog";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { trpc } from "@/lib/trpc/client";

export function ImportBucketsButton({ orgId }: { orgId: string }) {
  const [open, setOpen] = useState(false);

  const { data: accounts, isPending } = trpc.awsAccounts.list.useQuery({
    orgId,
    limit: 50,
  });

  const hasActiveAccount =
    accounts?.items.some((a) => a.status === "active") ?? false;
  const disabled = isPending || !hasActiveAccount;

  if (!disabled) {
    return (
      <>
        <Button onClick={() => setOpen(true)} variant="outline">
          Import existing
        </Button>
        <ImportBucketsDialog onOpenChange={setOpen} open={open} orgId={orgId} />
      </>
    );
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger className="inline-flex" render={<span />}>
          <Button disabled variant="outline">
            Import existing
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          Connect and verify an AWS account first to import buckets.
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
