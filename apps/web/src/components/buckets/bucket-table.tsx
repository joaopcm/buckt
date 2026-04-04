"use client";

import { HardDrive } from "lucide-react";
import Link from "next/link";
import { StatusBadge } from "@/components/buckets/status-badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { trpc } from "@/lib/trpc/client";

export function BucketTable({ orgId }: { orgId: string }) {
  const { data, isPending } = trpc.buckets.list.useQuery({ orgId });

  if (isPending) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div className="h-12 animate-pulse bg-muted" key={i} />
        ))}
      </div>
    );
  }

  if (!data?.items.length) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <HardDrive className="mb-4 size-10 text-muted-foreground" />
        <h2 className="font-medium text-lg">No buckets yet</h2>
        <p className="mt-1 text-muted-foreground text-sm">
          Create your first bucket to get started
        </p>
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Domain</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Created</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.items.map((bucket) => (
          <TableRow key={bucket.id}>
            <TableCell>
              <Link
                className="font-medium hover:underline"
                href={`/org/${orgId}/buckets/${bucket.id}`}
              >
                {bucket.name}
              </Link>
            </TableCell>
            <TableCell className="font-mono text-muted-foreground text-xs">
              {bucket.customDomain}
            </TableCell>
            <TableCell>
              <StatusBadge status={bucket.status} />
            </TableCell>
            <TableCell className="text-muted-foreground text-xs">
              {new Date(bucket.createdAt).toLocaleDateString()}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
