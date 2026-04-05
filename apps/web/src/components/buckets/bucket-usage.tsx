import { Activity, Database } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatBytes } from "@/lib/format";

export function BucketUsage({
  storageUsedBytes,
  bandwidthUsedBytes,
}: {
  storageUsedBytes: number;
  bandwidthUsedBytes: number;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="font-medium text-sm">Storage</CardTitle>
          <Database className="size-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="font-bold text-2xl">
            {formatBytes(storageUsedBytes)}
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
            {formatBytes(bandwidthUsedBytes)}
          </div>
          <p className="text-muted-foreground text-xs">this month</p>
        </CardContent>
      </Card>
    </div>
  );
}
