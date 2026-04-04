import type { Metadata } from "next";
import { BucketDetail } from "@/components/buckets/bucket-detail";

export const metadata: Metadata = { title: "Bucket" };

export default async function BucketDetailPage({
  params,
}: {
  params: Promise<{ orgId: string; id: string }>;
}) {
  const { orgId, id } = await params;
  return <BucketDetail bucketId={id} orgId={orgId} />;
}
