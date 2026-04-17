import type { Metadata } from "next";
import Link from "next/link";
import { AwsAccountTable } from "@/components/aws-accounts/aws-account-table";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "AWS Accounts" };

export default async function AwsAccountsPage({
  params,
}: {
  params: Promise<{ orgId: string }>;
}) {
  const { orgId } = await params;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-bold text-2xl tracking-tight">AWS Accounts</h1>
          <p className="mt-1 text-muted-foreground text-sm">
            Connect and manage your AWS accounts
          </p>
        </div>
        <Link href={`/org/${orgId}/aws-accounts/new`}>
          <Button>Connect account</Button>
        </Link>
      </div>

      <AwsAccountTable orgId={orgId} />
    </div>
  );
}
