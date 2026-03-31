import { OrgSettings } from "@/components/settings/org-settings"

export default async function SettingsPage({ params }: { params: Promise<{ orgId: string }> }) {
  const { orgId } = await params

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage your organization
        </p>
      </div>

      <OrgSettings orgId={orgId} />
    </div>
  )
}
