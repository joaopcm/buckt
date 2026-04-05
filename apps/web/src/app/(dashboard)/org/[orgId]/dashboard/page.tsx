import type { Metadata } from "next";
import { DashboardStats } from "@/components/dashboard-stats";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage({
  params,
}: {
  params: Promise<{ orgId: string }>;
}) {
  const { orgId } = await params;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-bold text-2xl tracking-tight">Dashboard</h1>
        <p className="mt-1 text-muted-foreground text-sm">
          Overview of your buckets and usage
        </p>
      </div>

      <DashboardStats orgId={orgId} />
    </div>
  );
}
