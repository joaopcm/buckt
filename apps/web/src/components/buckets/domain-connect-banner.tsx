"use client";

import { Loader2, Zap } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { trpc } from "@/lib/trpc/client";

export function DomainConnectBanner({
  orgId,
  bucketId,
  hasToken,
}: {
  orgId: string;
  bucketId: string;
  hasToken: boolean;
}) {
  const [dismissed, setDismissed] = useState(false);

  const startOAuth = trpc.domainConnect.startOAuth.useMutation({
    onSuccess: ({ authorizationUrl }) => {
      window.location.href = authorizationUrl;
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  if (dismissed) {
    return null;
  }

  if (hasToken) {
    return (
      <Card className="border-green-500/20 bg-green-500/5">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Zap className="size-4 text-green-600" />
            <CardTitle className="text-sm">
              Automatic DNS setup enabled
            </CardTitle>
          </div>
          <CardDescription className="text-xs">
            DNS records will be configured automatically as provisioning
            progresses.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="border-blue-500/20 bg-blue-500/5">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Zap className="size-4 text-blue-600" />
          <CardTitle className="text-sm">
            Automatic DNS setup available
          </CardTitle>
        </div>
        <CardDescription className="text-xs">
          Your DNS provider supports automatic configuration. Authorize Buckt to
          set up DNS records for you — no manual copying needed.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-2">
          <Button
            disabled={startOAuth.isPending}
            onClick={() => startOAuth.mutate({ orgId, bucketId })}
            size="sm"
          >
            {startOAuth.isPending && (
              <Loader2 className="mr-1.5 size-3 animate-spin" />
            )}
            Authorize DNS setup
          </Button>
          <Button onClick={() => setDismissed(true)} size="sm" variant="ghost">
            I'll do it manually
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
