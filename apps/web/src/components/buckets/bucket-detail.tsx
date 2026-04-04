"use client";

import Link from "next/link";
import { BucketActions } from "@/components/buckets/bucket-actions";
import { BucketUsage } from "@/components/buckets/bucket-usage";
import { DnsRecords } from "@/components/buckets/dns-records";
import { StatusBadge } from "@/components/buckets/status-badge";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc/client";

const POLLING_STATUSES = ["pending", "provisioning"];

export function BucketDetail({
  orgId,
  bucketId,
}: {
  orgId: string;
  bucketId: string;
}) {
  const { data: bucket, isPending } = trpc.buckets.get.useQuery(
    { orgId, id: bucketId },
    {
      refetchInterval: (query) => {
        const status = query.state.data?.status;
        return status && POLLING_STATUSES.includes(status) ? 10_000 : false;
      },
    }
  );

  if (isPending) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (!bucket) {
    return (
      <div className="space-y-4">
        <h1 className="font-bold text-2xl tracking-tight">Bucket not found</h1>
        <p className="text-muted-foreground text-sm">
          This bucket doesn't exist or you don't have access to it.
        </p>
        <Link
          className="text-sm underline underline-offset-4"
          href={`/org/${orgId}/buckets`}
        >
          Back to buckets
        </Link>
      </div>
    );
  }

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

      {(bucket.status === "provisioning" || bucket.status === "pending") &&
        bucket.dnsRecords && <DnsRecords records={bucket.dnsRecords} />}

      {bucket.status === "active" && (
        <>
          <DnsRecords records={bucket.dnsRecords} />
          <BucketUsage
            bandwidthUsedBytes={bucket.bandwidthUsedBytes}
            storageUsedBytes={bucket.storageUsedBytes}
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
