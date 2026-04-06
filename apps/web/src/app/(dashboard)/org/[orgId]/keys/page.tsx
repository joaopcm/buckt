import type { Metadata } from "next";
import Link from "next/link";
import { KeyTable } from "@/components/keys/key-table";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "API Keys" };

export default async function KeysPage({
  params,
}: {
  params: Promise<{ orgId: string }>;
}) {
  const { orgId } = await params;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-bold text-2xl tracking-tight">API Keys</h1>
          <p className="mt-1 text-muted-foreground text-sm">
            Manage API keys for programmatic access to your buckets
          </p>
        </div>
        <Link href={`/org/${orgId}/keys/new`}>
          <Button>Create key</Button>
        </Link>
      </div>

      <KeyTable orgId={orgId} />
    </div>
  );
}
