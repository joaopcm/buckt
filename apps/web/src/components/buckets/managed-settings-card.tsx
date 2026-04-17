"use client";

import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Field, FieldLabel } from "@/components/ui/field";
import { Switch } from "@/components/ui/switch";
import { trpc } from "@/lib/trpc/client";

interface ManagedSettings {
  cache?: boolean;
  cors?: boolean;
  lifecycle?: boolean;
  optimization?: boolean;
  visibility?: boolean;
}

const SETTING_LABELS: Record<keyof ManagedSettings, string> = {
  visibility: "Visibility",
  cache: "Cache Control",
  cors: "CORS Origins",
  lifecycle: "Lifecycle Rules",
  optimization: "Image Optimization",
};

export function ManagedSettingsCard({
  orgId,
  bucketId,
  managedSettings,
  isImported,
}: {
  orgId: string;
  bucketId: string;
  managedSettings: ManagedSettings;
  isImported: boolean;
}) {
  const utils = trpc.useUtils();

  const updateMutation = trpc.buckets.updateManagedSettings.useMutation({
    onSuccess: () => {
      utils.buckets.get.invalidate({ orgId, id: bucketId });
      toast.success("Settings updated");
    },
    onError: (err) => toast.error(err.message),
  });

  if (!isImported) {
    return null;
  }

  function toggleSetting(key: keyof ManagedSettings) {
    const current = managedSettings[key] ?? false;
    updateMutation.mutate({
      orgId,
      id: bucketId,
      ...managedSettings,
      [key]: !current,
    });
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <CardTitle>Managed Settings</CardTitle>
          <Badge variant="secondary">Imported</Badge>
        </div>
        <CardDescription>
          Choose which settings Buckt manages for this imported bucket. Disabled
          settings are read-only.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {(Object.keys(SETTING_LABELS) as (keyof ManagedSettings)[]).map(
            (key) => (
              <Field key={key} orientation="horizontal">
                <Switch
                  checked={managedSettings[key] ?? false}
                  disabled={updateMutation.isPending}
                  id={`managed-${key}`}
                  onCheckedChange={() => toggleSetting(key)}
                />
                <FieldLabel htmlFor={`managed-${key}`}>
                  {SETTING_LABELS[key]}
                </FieldLabel>
              </Field>
            )
          )}
        </div>
      </CardContent>
    </Card>
  );
}
