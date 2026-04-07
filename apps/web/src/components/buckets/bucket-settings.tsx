"use client";

import { X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { trpc } from "@/lib/trpc/client";

const CACHE_PRESETS = [
  {
    value: "no-cache",
    label: "No cache",
    header: "no-store, no-cache, must-revalidate",
  },
  { value: "short", label: "Short (1 hour)", header: "public, max-age=3600" },
  {
    value: "standard",
    label: "Standard (1 day)",
    header: "public, max-age=86400",
  },
  {
    value: "aggressive",
    label: "Aggressive (30 days)",
    header: "public, max-age=2592000, immutable",
  },
  {
    value: "immutable",
    label: "Immutable (1 year)",
    header: "public, max-age=31536000, immutable",
  },
] as const;

const LIFECYCLE_PRESETS = [
  { value: 7, label: "7 days" },
  { value: 30, label: "30 days" },
  { value: 90, label: "90 days" },
  { value: 365, label: "1 year" },
] as const;

type CachePresetValue = (typeof CACHE_PRESETS)[number]["value"];

interface BucketSettingsProps {
  bucket: {
    id: string;
    visibility: "public" | "private";
    cachePreset: string;
    cacheControlOverride: string | null;
    corsOrigins: string[];
    lifecycleTtlDays: number | null;
  };
  orgId: string;
}

export function BucketSettings({ bucket, orgId }: BucketSettingsProps) {
  return (
    <div className="space-y-6">
      <h2 className="font-semibold text-lg">Settings</h2>
      <VisibilityCard bucket={bucket} orgId={orgId} />
      <CachingCard bucket={bucket} orgId={orgId} />
      <CorsCard bucket={bucket} orgId={orgId} />
      <LifecycleCard bucket={bucket} orgId={orgId} />
    </div>
  );
}

function VisibilityCard({
  bucket,
  orgId,
}: {
  bucket: BucketSettingsProps["bucket"];
  orgId: string;
}) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const utils = trpc.useUtils();

  const updateSettings = trpc.buckets.updateSettings.useMutation({
    onSuccess: () => {
      utils.buckets.get.invalidate({ orgId, id: bucket.id });
      toast.success("Visibility updated");
    },
    onError: (error) => toast.error(error.message),
  });

  const isPublic = bucket.visibility === "public";
  const targetVisibility = isPublic ? "private" : "public";

  function handleToggle() {
    if (isPublic) {
      setConfirmOpen(true);
    } else {
      updateSettings.mutate({
        orgId,
        id: bucket.id,
        visibility: "public",
      });
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Visibility</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-muted-foreground text-sm">
          {isPublic
            ? "Files are publicly accessible via your custom domain."
            : "Files require authentication to access."}
        </p>
        <Button
          disabled={updateSettings.isPending}
          onClick={handleToggle}
          variant="outline"
        >
          {updateSettings.isPending
            ? "Updating..."
            : `Switch to ${targetVisibility}`}
        </Button>

        <ConfirmDialog
          confirmLabel="Make private"
          confirmValue="make private"
          description="Files will no longer be publicly accessible. Existing links will stop working."
          destructive
          loading={updateSettings.isPending}
          onConfirm={() =>
            updateSettings.mutate({
              orgId,
              id: bucket.id,
              visibility: "private",
            })
          }
          onOpenChange={setConfirmOpen}
          open={confirmOpen}
          title="Switch to private"
        />
      </CardContent>
    </Card>
  );
}

function CachingCard({
  bucket,
  orgId,
}: {
  bucket: BucketSettingsProps["bucket"];
  orgId: string;
}) {
  const [preset, setPreset] = useState<CachePresetValue>(
    bucket.cachePreset as CachePresetValue
  );
  const [override, setOverride] = useState(bucket.cacheControlOverride ?? "");
  const [showAdvanced, setShowAdvanced] = useState(
    bucket.cacheControlOverride !== null
  );
  const utils = trpc.useUtils();

  const updateSettings = trpc.buckets.updateSettings.useMutation({
    onSuccess: () => {
      utils.buckets.get.invalidate({ orgId, id: bucket.id });
      toast.success("Caching updated");
    },
    onError: (error) => toast.error(error.message),
  });

  const activePreset = CACHE_PRESETS.find((p) => p.value === preset);

  function handleSave() {
    updateSettings.mutate({
      orgId,
      id: bucket.id,
      cachePreset: preset,
      cacheControlOverride: showAdvanced && override ? override : null,
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Caching</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-2">
          <Label>Preset</Label>
          <Select
            items={CACHE_PRESETS}
            onValueChange={(v) => {
              if (v) {
                setPreset(v as CachePresetValue);
              }
            }}
            value={preset}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent align="start" alignItemWithTrigger={false}>
              {CACHE_PRESETS.map((p) => (
                <SelectItem key={p.value} value={p.value}>
                  {p.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {activePreset && (
            <p className="font-mono text-muted-foreground text-xs">
              {activePreset.header}
            </p>
          )}
        </div>

        <button
          className="text-muted-foreground text-sm underline"
          onClick={() => setShowAdvanced(!showAdvanced)}
          type="button"
        >
          {showAdvanced ? "Hide advanced" : "Advanced"}
        </button>

        {showAdvanced && (
          <div className="space-y-2">
            <Label>Custom Cache-Control</Label>
            <Input
              onChange={(e) => setOverride(e.target.value)}
              placeholder="public, max-age=600"
              value={override}
            />
            <p className="text-muted-foreground text-xs">
              Overrides the preset when set
            </p>
          </div>
        )}

        <Button
          disabled={updateSettings.isPending}
          onClick={handleSave}
          variant="outline"
        >
          {updateSettings.isPending ? "Saving..." : "Save"}
        </Button>
      </CardContent>
    </Card>
  );
}

function CorsCard({
  bucket,
  orgId,
}: {
  bucket: BucketSettingsProps["bucket"];
  orgId: string;
}) {
  const [origins, setOrigins] = useState(bucket.corsOrigins);
  const [input, setInput] = useState("");
  const utils = trpc.useUtils();

  const updateSettings = trpc.buckets.updateSettings.useMutation({
    onSuccess: () => {
      utils.buckets.get.invalidate({ orgId, id: bucket.id });
      toast.success("CORS updated");
    },
    onError: (error) => toast.error(error.message),
  });

  function addOrigin() {
    const trimmed = input.trim();
    if (!trimmed) {
      return;
    }
    try {
      new URL(trimmed);
    } catch {
      return;
    }
    if (origins.includes(trimmed) || origins.length >= 10) {
      return;
    }
    setOrigins([...origins, trimmed]);
    setInput("");
  }

  function removeOrigin(origin: string) {
    setOrigins(origins.filter((o) => o !== origin));
  }

  function handleSave() {
    updateSettings.mutate({ orgId, id: bucket.id, corsOrigins: origins });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">CORS</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex gap-2">
          <Input
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addOrigin();
              }
            }}
            placeholder="https://example.com"
            value={input}
          />
          <Button
            disabled={origins.length >= 10}
            onClick={addOrigin}
            type="button"
            variant="outline"
          >
            Add
          </Button>
        </div>
        {origins.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {origins.map((origin) => (
              <span
                className="inline-flex items-center gap-0.5 border border-input px-1.5 py-0.5 font-mono text-[10px]"
                key={origin}
              >
                {origin}
                {/* biome-ignore lint/a11y/useSemanticElements: nested interactive context */}
                <span
                  className="cursor-pointer text-muted-foreground hover:text-foreground"
                  onClick={() => removeOrigin(origin)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      removeOrigin(origin);
                    }
                  }}
                  role="button"
                  tabIndex={0}
                >
                  <X className="size-2.5" />
                </span>
              </span>
            ))}
          </div>
        )}
        <p className="text-muted-foreground text-xs">
          Origins allowed to access your files from a browser
        </p>
        <Button
          disabled={updateSettings.isPending}
          onClick={handleSave}
          variant="outline"
        >
          {updateSettings.isPending ? "Saving..." : "Save"}
        </Button>
      </CardContent>
    </Card>
  );
}

function LifecycleCard({
  bucket,
  orgId,
}: {
  bucket: BucketSettingsProps["bucket"];
  orgId: string;
}) {
  const [ttl, setTtl] = useState(bucket.lifecycleTtlDays?.toString() ?? "");
  const utils = trpc.useUtils();

  const updateSettings = trpc.buckets.updateSettings.useMutation({
    onSuccess: () => {
      utils.buckets.get.invalidate({ orgId, id: bucket.id });
      toast.success("Lifecycle updated");
    },
    onError: (error) => toast.error(error.message),
  });

  function handleSave() {
    updateSettings.mutate({
      orgId,
      id: bucket.id,
      lifecycleTtlDays: ttl ? Number(ttl) : null,
    });
  }

  const ttlNumber = ttl ? Number(ttl) : null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Lifecycle</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-2">
          <Label>Auto-delete after</Label>
          <div className="flex">
            <Input
              className="rounded-r-none border-r-0"
              max={3650}
              min={1}
              onChange={(e) => setTtl(e.target.value)}
              placeholder="Never"
              type="number"
              value={ttl}
            />
            <span className="inline-flex items-center border border-input bg-muted px-3 text-muted-foreground text-xs">
              days
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {LIFECYCLE_PRESETS.map((preset) => (
              <button
                className={`border px-2 py-0.5 text-xs transition-colors ${
                  ttlNumber === preset.value
                    ? "border-foreground bg-foreground text-background"
                    : "border-input text-muted-foreground hover:border-foreground hover:text-foreground"
                }`}
                key={preset.value}
                onClick={() => setTtl(String(preset.value))}
                type="button"
              >
                {preset.label}
              </button>
            ))}
            {ttl && (
              <button
                className="border border-input px-2 py-0.5 text-muted-foreground text-xs hover:border-foreground hover:text-foreground"
                onClick={() => setTtl("")}
                type="button"
              >
                Clear
              </button>
            )}
          </div>
        </div>
        <Button
          disabled={updateSettings.isPending}
          onClick={handleSave}
          variant="outline"
        >
          {updateSettings.isPending ? "Saving..." : "Save"}
        </Button>
      </CardContent>
    </Card>
  );
}
