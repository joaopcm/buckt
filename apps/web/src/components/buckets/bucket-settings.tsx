"use client";

import { X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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

const VISIBILITY_OPTIONS = [
  { value: "public", label: "Public — files served openly via custom domain" },
  { value: "private", label: "Private — files require authentication" },
] as const;

const CACHE_PRESETS = [
  { value: "no-cache", label: "No cache" },
  { value: "short", label: "Short (1 hour)" },
  { value: "standard", label: "Standard (1 day)" },
  { value: "aggressive", label: "Aggressive (30 days)" },
  { value: "immutable", label: "Immutable (1 year)" },
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
  disabled?: boolean;
  orgId: string;
}

export function BucketSettings({
  bucket,
  disabled,
  orgId,
}: BucketSettingsProps) {
  return (
    <div className="space-y-6">
      <h2 className="font-semibold text-lg">Settings</h2>
      <VisibilityCard bucket={bucket} disabled={disabled} orgId={orgId} />
      <CachingCard bucket={bucket} disabled={disabled} orgId={orgId} />
      <CorsCard bucket={bucket} disabled={disabled} orgId={orgId} />
      <LifecycleCard bucket={bucket} disabled={disabled} orgId={orgId} />
    </div>
  );
}

function VisibilityCard({
  bucket,
  disabled,
  orgId,
}: {
  bucket: BucketSettingsProps["bucket"];
  disabled?: boolean;
  orgId: string;
}) {
  const [visibility, setVisibility] = useState(bucket.visibility);
  const utils = trpc.useUtils();

  const updateSettings = trpc.buckets.updateSettings.useMutation({
    onSuccess: () => {
      utils.buckets.get.invalidate({ orgId, id: bucket.id });
      toast.success("Visibility updated");
    },
    onError: (error) => toast.error(error.message),
  });

  function handleSave() {
    updateSettings.mutate({ orgId, id: bucket.id, visibility });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Visibility</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <Select
          disabled={disabled}
          items={VISIBILITY_OPTIONS}
          onValueChange={(v) => {
            if (v) {
              setVisibility(v as "public" | "private");
            }
          }}
          value={visibility}
        >
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent align="start" alignItemWithTrigger={false}>
            {VISIBILITY_OPTIONS.map((v) => (
              <SelectItem key={v.value} value={v.value}>
                {v.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          disabled={
            disabled ||
            updateSettings.isPending ||
            visibility === bucket.visibility
          }
          onClick={handleSave}
        >
          {updateSettings.isPending ? "Saving..." : "Save"}
        </Button>
      </CardContent>
    </Card>
  );
}

function CachingCard({
  bucket,
  disabled,
  orgId,
}: {
  bucket: BucketSettingsProps["bucket"];
  disabled?: boolean;
  orgId: string;
}) {
  const [preset, setPreset] = useState<CachePresetValue>(
    bucket.cachePreset as CachePresetValue
  );
  const utils = trpc.useUtils();

  const updateSettings = trpc.buckets.updateSettings.useMutation({
    onSuccess: () => {
      utils.buckets.get.invalidate({ orgId, id: bucket.id });
      toast.success("Caching updated");
    },
    onError: (error) => toast.error(error.message),
  });

  function handleSave() {
    updateSettings.mutate({
      orgId,
      id: bucket.id,
      cachePreset: preset,
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
            disabled={disabled}
            items={CACHE_PRESETS}
            onValueChange={(v) => {
              if (v) {
                setPreset(v as CachePresetValue);
              }
            }}
            value={preset}
          >
            <SelectTrigger className="w-full">
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
        </div>

        <Button
          disabled={
            disabled ||
            updateSettings.isPending ||
            preset === bucket.cachePreset
          }
          onClick={handleSave}
        >
          {updateSettings.isPending ? "Saving..." : "Save"}
        </Button>
      </CardContent>
    </Card>
  );
}

function CorsCard({
  bucket,
  disabled,
  orgId,
}: {
  bucket: BucketSettingsProps["bucket"];
  disabled?: boolean;
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
        <CardDescription>
          Origins allowed to access your files from a browser
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex gap-2">
          <Input
            disabled={disabled}
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
            disabled={disabled || origins.length >= 10}
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
                  className={
                    disabled
                      ? "text-muted-foreground/50"
                      : "cursor-pointer text-muted-foreground hover:text-foreground"
                  }
                  onClick={() => {
                    if (!disabled) {
                      removeOrigin(origin);
                    }
                  }}
                  onKeyDown={(e) => {
                    if (!disabled && (e.key === "Enter" || e.key === " ")) {
                      removeOrigin(origin);
                    }
                  }}
                  role="button"
                  tabIndex={disabled ? -1 : 0}
                >
                  <X className="size-2.5" />
                </span>
              </span>
            ))}
          </div>
        )}
        <Button
          disabled={disabled || updateSettings.isPending}
          onClick={handleSave}
        >
          {updateSettings.isPending ? "Saving..." : "Save"}
        </Button>
      </CardContent>
    </Card>
  );
}

function LifecycleCard({
  bucket,
  disabled,
  orgId,
}: {
  bucket: BucketSettingsProps["bucket"];
  disabled?: boolean;
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
              disabled={disabled}
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
                } ${disabled ? "pointer-events-none opacity-50" : ""}`}
                disabled={disabled}
                key={preset.value}
                onClick={() => setTtl(String(preset.value))}
                type="button"
              >
                {preset.label}
              </button>
            ))}
            {ttl && (
              <button
                className={`border border-input px-2 py-0.5 text-muted-foreground text-xs hover:border-foreground hover:text-foreground ${disabled ? "pointer-events-none opacity-50" : ""}`}
                disabled={disabled}
                onClick={() => setTtl("")}
                type="button"
              >
                Clear
              </button>
            )}
          </div>
        </div>
        <Button
          disabled={disabled || updateSettings.isPending}
          onClick={handleSave}
        >
          {updateSettings.isPending ? "Saving..." : "Save"}
        </Button>
      </CardContent>
    </Card>
  );
}
