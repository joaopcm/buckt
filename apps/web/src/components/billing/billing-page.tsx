"use client";

import { ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useOrgRole } from "@/hooks/use-org-role";
import { authClient } from "@/lib/auth-client";
import { formatBytes, formatDate } from "@/lib/format";
import { trpc } from "@/lib/trpc/client";

function formatLimit(value: number): string {
  if (!Number.isFinite(value)) {
    return "Unlimited";
  }
  return value.toLocaleString();
}

function formatLimitBytes(bytes: number): string {
  if (!Number.isFinite(bytes)) {
    return "Unlimited";
  }
  return formatBytes(bytes);
}

function UsageBar({ used, limit }: { used: number; limit: number }) {
  const pct = Number.isFinite(limit) ? Math.min((used / limit) * 100, 100) : 0;
  return (
    <div className="h-1 w-full rounded-none bg-muted">
      <div
        className="h-full rounded-none bg-primary transition-all"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

function StatusBadge({
  isFree,
  isCanceling,
  cancelDate,
}: {
  isFree: boolean;
  isCanceling: boolean;
  cancelDate: string;
}) {
  if (isCanceling) {
    return <Badge variant="secondary">Cancels {cancelDate}</Badge>;
  }
  if (isFree) {
    return <Badge variant="outline">Free</Badge>;
  }
  return <Badge className="bg-emerald-500/10 text-emerald-500">Active</Badge>;
}

function DisabledTooltipButton({
  disabled,
  tooltip,
  onClick,
  variant = "default",
  children,
}: {
  disabled: boolean;
  tooltip: string;
  onClick: () => void;
  variant?: "default" | "outline";
  children: React.ReactNode;
}) {
  if (!disabled) {
    return (
      <Button onClick={onClick} variant={variant}>
        {children}
      </Button>
    );
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger className="inline-flex" render={<span />}>
          <Button disabled onClick={onClick} variant={variant}>
            {children}
          </Button>
        </TooltipTrigger>
        <TooltipContent>{tooltip}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

function BillingActions({
  orgId,
  isAdmin,
  isFree,
}: {
  orgId: string;
  isAdmin: boolean;
  isFree: boolean;
}) {
  async function handleChoosePlan() {
    const { error } = await authClient.subscription.upgrade({
      plan: "pro",
      referenceId: orgId,
      customerType: "organization",
      successUrl: `${window.location.origin}/org/${orgId}/billing`,
      cancelUrl: `${window.location.origin}/org/${orgId}/billing`,
      disableRedirect: false,
    });
    if (error) {
      toast.error(error.message ?? "Failed to start checkout");
    }
  }

  async function handleManageBilling() {
    const { data, error } = await authClient.subscription.billingPortal({
      referenceId: orgId,
      customerType: "organization",
      returnUrl: `${window.location.origin}/org/${orgId}/billing`,
      disableRedirect: true,
    });
    if (error) {
      toast.error(error.message ?? "Failed to open billing portal");
      return;
    }
    if (data?.url) {
      window.open(data.url, "_blank", "noopener,noreferrer");
    }
  }

  return (
    <div className="flex gap-2">
      {isFree && (
        <DisabledTooltipButton
          disabled={!isAdmin}
          onClick={handleChoosePlan}
          tooltip="Only admins can manage billing"
        >
          Choose Plan
        </DisabledTooltipButton>
      )}
      <DisabledTooltipButton
        disabled={!isAdmin || isFree}
        onClick={handleManageBilling}
        tooltip={
          isFree
            ? "No active subscription to manage"
            : "Only admins can manage billing"
        }
        variant="outline"
      >
        <ExternalLink />
        Manage Billing
      </DisabledTooltipButton>
    </div>
  );
}

function BillingSkeleton() {
  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <Skeleton className="h-7 w-24" />
          <Skeleton className="mt-2 h-4 w-64" />
        </div>
        <Skeleton className="h-8 w-32" />
      </div>
      <Skeleton className="h-24" />
      <div className="grid gap-4 sm:grid-cols-3">
        <Skeleton className="h-28" />
        <Skeleton className="h-28" />
        <Skeleton className="h-28" />
      </div>
    </div>
  );
}

export function BillingPage({ orgId }: { orgId: string }) {
  const { isAdmin } = useOrgRole(orgId);
  const { data: sub, isPending: subLoading } =
    trpc.billing.subscription.useQuery({ orgId });
  const { data: usage, isPending: usageLoading } = trpc.billing.usage.useQuery({
    orgId,
  });

  if (subLoading || usageLoading) {
    return <BillingSkeleton />;
  }

  const isFree = sub?.status === "free";
  const isCanceling = !isFree && (sub?.cancelAtPeriodEnd ?? false);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-bold text-2xl tracking-tight">Billing</h1>
          <p className="mt-1 text-muted-foreground text-sm">
            Manage your organization's subscription and usage
          </p>
        </div>
        <BillingActions isAdmin={isAdmin} isFree={isFree} orgId={orgId} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-lg capitalize">{sub?.plan ?? "free"}</span>
              <StatusBadge
                cancelDate={formatDate(sub?.cancelAt ?? sub?.periodEnd)}
                isCanceling={isCanceling}
                isFree={isFree}
              />
            </div>
            {!isFree && sub?.periodStart && sub?.periodEnd && (
              <span className="font-normal text-muted-foreground text-xs">
                {formatDate(sub.periodStart)} — {formatDate(sub.periodEnd)}
              </span>
            )}
          </CardTitle>
        </CardHeader>
      </Card>

      <div className="space-y-2">
        <div className="grid gap-4 sm:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle className="font-medium text-sm">Buckets</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="font-bold text-2xl">
                {usage?.buckets.used ?? 0}{" "}
                <span className="font-normal text-muted-foreground text-sm">
                  / {formatLimit(usage?.buckets.limit ?? 0)}
                </span>
              </p>
              <UsageBar
                limit={usage?.buckets.limit ?? 0}
                used={usage?.buckets.used ?? 0}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="font-medium text-sm">Storage</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="font-bold text-2xl">
                {formatBytes(usage?.storage.usedBytes ?? 0)}{" "}
                <span className="font-normal text-muted-foreground text-sm">
                  / {formatLimitBytes(usage?.storage.limitBytes ?? 0)}
                </span>
              </p>
              <UsageBar
                limit={usage?.storage.limitBytes ?? 0}
                used={usage?.storage.usedBytes ?? 0}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="font-medium text-sm">Bandwidth</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="font-bold text-2xl">
                {formatBytes(usage?.bandwidth.usedBytes ?? 0)}{" "}
                <span className="font-normal text-muted-foreground text-sm">
                  / {formatLimitBytes(usage?.bandwidth.limitBytes ?? 0)}
                </span>
              </p>
              <UsageBar
                limit={usage?.bandwidth.limitBytes ?? 0}
                used={usage?.bandwidth.usedBytes ?? 0}
              />
            </CardContent>
          </Card>
        </div>
        <p className="text-muted-foreground/60 text-xs">
          Storage updates on file changes. Bandwidth is aggregated daily.
        </p>
      </div>
    </div>
  );
}
