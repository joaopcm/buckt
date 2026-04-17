import type { Metadata } from "next";
import { ConnectAwsForm } from "@/components/aws-accounts/connect-aws-form";

export const metadata: Metadata = { title: "Connect AWS Account" };

export default async function NewAwsAccountPage({
  params,
}: {
  params: Promise<{ orgId: string }>;
}) {
  const { orgId } = await params;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-bold text-2xl tracking-tight">
          Connect AWS account
        </h1>
        <p className="mt-1 text-muted-foreground text-sm">
          Set up cross-account access to manage resources in your AWS account
        </p>
      </div>

      <ConnectAwsForm orgId={orgId} />
    </div>
  );
}
