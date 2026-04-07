import type { Metadata } from "next";
import { BillingPage } from "@/components/billing/billing-page";

export const metadata: Metadata = { title: "Billing" };

export default async function Billing({
  params,
}: {
  params: Promise<{ orgId: string }>;
}) {
  const { orgId } = await params;

  return <BillingPage orgId={orgId} />;
}
