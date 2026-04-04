import type { Metadata } from "next";
import { CreateBucketForm } from "@/components/buckets/create-bucket-form";

export const metadata: Metadata = { title: "New Bucket" };

export default async function NewBucketPage({
  params,
}: {
  params: Promise<{ orgId: string }>;
}) {
  const { orgId } = await params;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-bold text-2xl tracking-tight">New bucket</h1>
        <p className="mt-1 text-muted-foreground text-sm">
          Create a new branded S3 bucket with a custom domain
        </p>
      </div>

      <CreateBucketForm orgId={orgId} />
    </div>
  );
}
