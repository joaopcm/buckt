import type { Metadata } from "next";
import Link from "next/link";
import { BucketTable } from "@/components/buckets/bucket-table";
import { ImportBucketsButton } from "@/components/buckets/import-buckets-button";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Buckets" };

export default async function BucketsPage({
  params,
}: {
  params: Promise<{ orgId: string }>;
}) {
  const { orgId } = await params;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-bold text-2xl tracking-tight">Buckets</h1>
          <p className="mt-1 text-muted-foreground text-sm">
            Manage your branded S3 buckets
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ImportBucketsButton orgId={orgId} />
          <Link href={`/org/${orgId}/buckets/new`}>
            <Button>New bucket</Button>
          </Link>
        </div>
      </div>

      <BucketTable orgId={orgId} />
    </div>
  );
}
