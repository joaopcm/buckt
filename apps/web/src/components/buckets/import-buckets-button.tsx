"use client";

import { useState } from "react";
import { ImportBucketsDialog } from "@/components/aws-accounts/import-dialog";
import { Button } from "@/components/ui/button";

export function ImportBucketsButton({ orgId }: { orgId: string }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button onClick={() => setOpen(true)} variant="outline">
        Import existing
      </Button>
      <ImportBucketsDialog onOpenChange={setOpen} open={open} orgId={orgId} />
    </>
  );
}
