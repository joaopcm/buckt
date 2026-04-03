import type { Metadata } from "next";
import { OrgSettings } from "@/components/settings/org-settings";

export const metadata: Metadata = { title: "Settings — Buckt" };

export default async function SettingsPage({
  params,
}: {
  params: Promise<{ orgId: string }>;
}) {
  const { orgId } = await params;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-bold text-2xl tracking-tight">Settings</h1>
        <p className="mt-1 text-muted-foreground text-sm">
          Manage your organization
        </p>
      </div>

      <OrgSettings orgId={orgId} />
    </div>
  );
}
