"use client";

import type { ManagedSettings } from "@buckt/shared";
import { useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { BucketActions } from "@/components/buckets/bucket-actions";
import { BucketSettings } from "@/components/buckets/bucket-settings";
import { BucketUsage } from "@/components/buckets/bucket-usage";
import { DomainConnectBanner } from "@/components/buckets/domain-connect-banner";
import { FileBrowser } from "@/components/buckets/file-browser";
import { PendingCnameBanner } from "@/components/buckets/pending-cname-banner";
import { ProvisioningSteps } from "@/components/buckets/provisioning-steps";
import { StatusBadge } from "@/components/buckets/status-badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useOrgRole } from "@/hooks/use-org-role";
import { trpc } from "@/lib/trpc/client";

const POLLING_STATUSES = ["pending", "provisioning"];

export function BucketDetail({
  orgId,
  bucketId,
}: {
  orgId: string;
  bucketId: string;
}) {
  const { isAdmin } = useOrgRole(orgId);
  const utils = trpc.useUtils();
  const searchParams = useSearchParams();
  const dcToastShown = useRef(false);

  useEffect(() => {
    if (dcToastShown.current) {
      return;
    }
    const dc = searchParams.get("dc");
    if (dc === "success") {
      toast.success("DNS records applied automatically");
      dcToastShown.current = true;
    } else if (dc === "error") {
      toast.error("DNS setup failed — you can add records manually");
      dcToastShown.current = true;
    }
  }, [searchParams]);

  const { data: bucket, isPending } = trpc.buckets.get.useQuery(
    { orgId, id: bucketId },
    {
      refetchInterval: (query) => {
        const status = query.state.data?.status;
        return status && POLLING_STATUSES.includes(status) ? 10_000 : false;
      },
    }
  );

  const cnameVerification = trpc.buckets.verifyCname.useQuery(
    { orgId, id: bucketId },
    {
      enabled: bucket?.status === "active",
      refetchInterval: (query) => (query.state.data?.verified ? false : 30_000),
    }
  );

  useEffect(() => {
    if (cnameVerification.data?.verified) {
      utils.buckets.get.invalidate({ orgId, id: bucketId });
    }
  }, [cnameVerification.data?.verified, utils, orgId, bucketId]);

  if (isPending || !bucket) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  const hasDomainConnect = !!bucket.domainConnectProvider;
  const cnameVerified = cnameVerification.data?.verified ?? false;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h1 className="font-bold text-2xl tracking-tight">{bucket.name}</h1>
            <StatusBadge status={bucket.status} />
          </div>
          <p className="font-mono text-muted-foreground text-sm">
            {bucket.customDomain}
          </p>
        </div>
        <BucketActions bucket={bucket} orgId={orgId} />
      </div>

      {(bucket.status === "provisioning" || bucket.status === "pending") && (
        <>
          {hasDomainConnect && <DomainConnectBanner />}
          <ProvisioningSteps
            bucketId={bucketId}
            domain={bucket.customDomain}
            hasDomainConnect={hasDomainConnect}
            orgId={orgId}
            records={bucket.dnsRecords}
          />
        </>
      )}

      {bucket.status === "active" && (
        <>
          {(() => {
            const dnsRecords = (
              Array.isArray(bucket.dnsRecords) ? bucket.dnsRecords : []
            ) as Array<{
              name: string;
              type: string;
              value: string;
              applied?: boolean;
            }>;
            const pendingCname = dnsRecords.find(
              (r) =>
                r.type === "CNAME" &&
                r.name === bucket.customDomain &&
                !r.applied
            );
            if (!pendingCname || cnameVerified) {
              return null;
            }
            return (
              <PendingCnameBanner
                bucketId={bucketId}
                cnameRecord={pendingCname}
                hasDomainConnect={hasDomainConnect}
                orgId={orgId}
              />
            );
          })()}
          <BucketUsage
            bandwidthUsedBytes={bucket.bandwidthUsedBytes}
            storageUsedBytes={bucket.storageUsedBytes}
          />
          <FileBrowser
            bucketId={bucket.id}
            bucketName={bucket.name}
            customDomain={bucket.customDomain}
            orgId={orgId}
            region={bucket.region}
            visibility={bucket.visibility}
          />
          <BucketSettings
            bucket={bucket}
            disabled={!isAdmin}
            dnsRecords={bucket.dnsRecords}
            isImported={bucket.isImported}
            managedSettings={(bucket.managedSettings ?? {}) as ManagedSettings}
            orgId={orgId}
          />
        </>
      )}

      {bucket.status === "failed" && (
        <div className="border border-destructive/20 bg-destructive/5 p-4">
          <p className="font-medium text-destructive text-sm">
            Provisioning failed
          </p>
          <p className="mt-1 text-muted-foreground text-xs">
            Click "Retry" to try again. If the issue persists, check your DNS
            configuration.
          </p>
        </div>
      )}
    </div>
  );
}
