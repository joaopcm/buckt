"use client";

import type { ManagedSettings } from "@buckt/shared";
import type { CSSProperties, ReactNode } from "react";
import { useState } from "react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc/client";

const LEFT_MASK: CSSProperties = {
  maskImage: "linear-gradient(to right, black 0%, black 25%, transparent 70%)",
  WebkitMaskImage:
    "linear-gradient(to right, black 0%, black 25%, transparent 70%)",
};

const RIGHT_MASK: CSSProperties = {
  maskImage: "linear-gradient(to right, transparent 25%, black 75%)",
  WebkitMaskImage: "linear-gradient(to right, transparent 25%, black 75%)",
};

interface ManagedSettingGuardProps {
  bucketId: string;
  children: ReactNode;
  currentSettings: ManagedSettings;
  description: string;
  managed: boolean;
  orgId: string;
  settingKey: keyof ManagedSettings;
  settingLabel: string;
}

export function ManagedSettingGuard({
  bucketId,
  children,
  currentSettings,
  description,
  managed,
  orgId,
  settingKey,
  settingLabel,
}: ManagedSettingGuardProps) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const utils = trpc.useUtils();

  const mutation = trpc.buckets.updateManagedSettings.useMutation({
    onSuccess: () => {
      utils.buckets.get.invalidate({ orgId, id: bucketId });
      toast.success(`${settingLabel} management enabled`);
      setConfirmOpen(false);
    },
    onError: (err) => toast.error(err.message),
  });

  if (managed) {
    return <>{children}</>;
  }

  const settingPhrase =
    settingLabel === settingLabel.toUpperCase()
      ? settingLabel
      : settingLabel.toLowerCase();

  function handleConfirm() {
    mutation.mutate({
      orgId,
      id: bucketId,
      ...currentSettings,
      [settingKey]: true,
    });
  }

  return (
    <>
      <div className="relative overflow-hidden ring-1 ring-foreground/10">
        <div
          aria-hidden
          className="pointer-events-none select-none"
          inert
          style={LEFT_MASK}
        >
          {children}
        </div>
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 select-none blur-xl"
          inert
          style={RIGHT_MASK}
        >
          {children}
        </div>
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-gradient-to-r from-transparent via-background/40 to-background/90"
        />
        <div className="absolute inset-y-0 right-0 flex w-1/2 flex-col items-end justify-center gap-2 p-6 text-right">
          <p className="font-medium text-sm">Not managed by Buckt</p>
          <p className="max-w-xs text-muted-foreground text-xs">
            {description}
          </p>
          <Button onClick={() => setConfirmOpen(true)} size="sm">
            Enable
          </Button>
        </div>
      </div>

      <ConfirmDialog
        confirmLabel="Enable"
        confirmValue={`Enable ${settingPhrase}`}
        description={`Buckt will start managing ${settingPhrase} for this bucket. Existing AWS-side configuration may be overwritten when you save changes from the dashboard.`}
        loading={mutation.isPending}
        onConfirm={handleConfirm}
        onOpenChange={setConfirmOpen}
        open={confirmOpen}
        title={`Enable ${settingPhrase} management`}
      />
    </>
  );
}
