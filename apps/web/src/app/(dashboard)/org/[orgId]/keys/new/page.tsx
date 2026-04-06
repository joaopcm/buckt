import type { Metadata } from "next";
import { CreateKeyForm } from "@/components/keys/create-key-form";

export const metadata: Metadata = { title: "New API Key" };

export default async function NewKeyPage({
  params,
}: {
  params: Promise<{ orgId: string }>;
}) {
  const { orgId } = await params;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-bold text-2xl tracking-tight">New API key</h1>
        <p className="mt-1 text-muted-foreground text-sm">
          Create an API key for programmatic access
        </p>
      </div>

      <CreateKeyForm orgId={orgId} />
    </div>
  );
}
