import { buckets } from "@buckt/db";
import { eq } from "drizzle-orm";
import type { Metadata } from "next";
import { BucketDetail } from "@/components/buckets/bucket-detail";
import { db } from "@/lib/db";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const [bucket] = await db
    .select({ name: buckets.name })
    .from(buckets)
    .where(eq(buckets.id, id))
    .limit(1);

  return { title: bucket?.name ?? "Bucket" };
}

export default async function BucketDetailPage({
  params,
}: {
  params: Promise<{ orgId: string; id: string }>;
}) {
  const { orgId, id } = await params;
  return <BucketDetail bucketId={id} orgId={orgId} />;
}
