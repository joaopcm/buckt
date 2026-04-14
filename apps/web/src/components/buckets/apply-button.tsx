"use client";

import { Loader2, Zap } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc/client";

export function ApplyButton({
  orgId,
  bucketId,
  serviceId,
}: {
  orgId: string;
  bucketId: string;
  serviceId: "acm-validation" | "cdn-cname";
}) {
  const buildSyncUrl = trpc.domainConnect.buildSyncUrl.useMutation({
    onSuccess: ({ syncUrl }) => {
      window.location.href = syncUrl;
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  return (
    <Button
      disabled={buildSyncUrl.isPending}
      onClick={() => buildSyncUrl.mutate({ orgId, bucketId, serviceId })}
      size="sm"
      variant="default"
    >
      {buildSyncUrl.isPending ? (
        <Loader2 className="mr-1.5 size-3 animate-spin" />
      ) : (
        <Zap className="mr-1.5 size-3" />
      )}
      Apply automatically
    </Button>
  );
}
