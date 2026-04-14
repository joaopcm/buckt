"use client";

import { Cloud, Plus, RefreshCw, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { ConnectAwsDialog } from "@/components/aws-accounts/connect-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc/client";

const STATUS_BADGE: Record<
  string,
  {
    label: string;
    variant: "default" | "secondary" | "destructive" | "outline";
  }
> = {
  pending: { label: "Pending", variant: "outline" },
  validating: { label: "Validating", variant: "secondary" },
  active: { label: "Active", variant: "default" },
  failed: { label: "Failed", variant: "destructive" },
};

export function AwsAccountsCard({
  orgId,
  isAdmin,
}: {
  orgId: string;
  isAdmin: boolean;
}) {
  const [connectOpen, setConnectOpen] = useState(false);

  const { data, isPending } = trpc.awsAccounts.list.useQuery({
    orgId,
    limit: 50,
  });

  const utils = trpc.useUtils();

  const validateMutation = trpc.awsAccounts.validate.useMutation({
    onSuccess: () => {
      utils.awsAccounts.list.invalidate({ orgId });
      toast.success("AWS account validated");
    },
    onError: (err) => toast.error(err.message),
  });

  const disconnectMutation = trpc.awsAccounts.disconnect.useMutation({
    onSuccess: () => {
      utils.awsAccounts.list.invalidate({ orgId });
      utils.buckets.list.invalidate();
      toast.success("AWS account disconnected");
    },
    onError: (err) => toast.error(err.message),
  });

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>AWS Accounts</CardTitle>
              <CardDescription>
                Connect your AWS accounts to create and import buckets
              </CardDescription>
            </div>
            {isAdmin && (
              <Button
                onClick={() => setConnectOpen(true)}
                size="sm"
                variant="outline"
              >
                <Plus className="mr-1.5 h-4 w-4" />
                Connect
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {isPending && (
            <div className="space-y-3">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          )}
          {!(isPending || data?.items.length) && (
            <p className="text-muted-foreground text-sm">
              No AWS accounts connected
            </p>
          )}
          {!isPending && data?.items.length ? (
            <div className="space-y-3">
              {data.items.map((account) => {
                const badge =
                  STATUS_BADGE[account.status] ?? STATUS_BADGE.pending;
                return (
                  <div
                    className="flex items-center justify-between rounded-md border p-3"
                    key={account.id}
                  >
                    <div className="flex items-center gap-3">
                      <Cloud className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="font-medium text-sm">
                          {account.label ||
                            account.awsAccountId ||
                            "Pending setup"}
                        </p>
                        {account.awsAccountId && (
                          <p className="text-muted-foreground text-xs">
                            {account.awsAccountId}
                          </p>
                        )}
                      </div>
                      <Badge variant={badge.variant}>{badge.label}</Badge>
                    </div>
                    {isAdmin && (
                      <div className="flex gap-1">
                        {(account.status === "pending" ||
                          account.status === "failed") && (
                          <Button
                            disabled={validateMutation.isPending}
                            onClick={() =>
                              validateMutation.mutate({ orgId, id: account.id })
                            }
                            size="icon"
                            variant="ghost"
                          >
                            <RefreshCw className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          disabled={disconnectMutation.isPending}
                          onClick={() =>
                            disconnectMutation.mutate({ orgId, id: account.id })
                          }
                          size="icon"
                          variant="ghost"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : null}
        </CardContent>
      </Card>

      <ConnectAwsDialog
        onOpenChange={setConnectOpen}
        open={connectOpen}
        orgId={orgId}
      />
    </>
  );
}
