"use client";

import { Activity, Database, HardDrive } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatBytes } from "@/lib/format";
import { trpc } from "@/lib/trpc/client";

export function DashboardStats({ orgId }: { orgId: string }) {
  const { data, isPending } = trpc.buckets.stats.useQuery({ orgId });

  if (isPending) {
    return (
      <div className="grid gap-4 sm:grid-cols-3">
        <Skeleton className="h-28" />
        <Skeleton className="h-28" />
        <Skeleton className="h-28" />
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="font-medium text-sm">Buckets</CardTitle>
            <HardDrive className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="font-bold text-2xl">{data?.bucketCount ?? 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="font-medium text-sm">Storage</CardTitle>
            <Database className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="font-bold text-2xl">
              {formatBytes(data?.totalStorageBytes ?? 0)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="font-medium text-sm">Bandwidth</CardTitle>
            <Activity className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="font-bold text-2xl">
              {formatBytes(data?.totalBandwidthBytes ?? 0)}
            </div>
            <p className="text-muted-foreground text-xs">this month</p>
          </CardContent>
        </Card>
      </div>
      <p className="text-muted-foreground/60 text-xs">
        Storage updates on file changes. Bandwidth is aggregated daily.
      </p>
    </div>
  );
}
