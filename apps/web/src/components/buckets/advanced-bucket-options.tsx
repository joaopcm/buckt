"use client";

import { Accordion } from "@base-ui/react/accordion";
import type { FlagComponent } from "country-flag-icons/react/3x2";
import DE from "country-flag-icons/react/3x2/DE";
import IE from "country-flag-icons/react/3x2/IE";
import JP from "country-flag-icons/react/3x2/JP";
import SG from "country-flag-icons/react/3x2/SG";
import US from "country-flag-icons/react/3x2/US";
import { ChevronDown, X } from "lucide-react";
import { useState } from "react";
import type {
  FieldErrors,
  UseFormSetValue,
  UseFormWatch,
} from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface CreateBucketValues {
  cachePreset: "no-cache" | "short" | "standard" | "aggressive" | "immutable";
  corsOrigins: string[];
  customDomain: string;
  lifecycleTtlDays: number | null;
  name: string;
  region: string;
  visibility: "public" | "private";
}

const REGIONS: ReadonlyArray<{
  value: string;
  label: string;
  Flag: FlagComponent;
}> = [
  { value: "us-east-1", label: "US East (N. Virginia)", Flag: US },
  { value: "us-west-2", label: "US West (Oregon)", Flag: US },
  { value: "eu-west-1", label: "Europe (Ireland)", Flag: IE },
  { value: "eu-central-1", label: "Europe (Frankfurt)", Flag: DE },
  { value: "ap-southeast-1", label: "Asia Pacific (Singapore)", Flag: SG },
  { value: "ap-northeast-1", label: "Asia Pacific (Tokyo)", Flag: JP },
];

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

interface AdvancedBucketOptionsProps {
  defaultRegion: string;
  errors: FieldErrors<CreateBucketValues>;
  setValue: UseFormSetValue<CreateBucketValues>;
  watch: UseFormWatch<CreateBucketValues>;
}

export function AdvancedBucketOptions({
  defaultRegion,
  setValue,
  watch,
  errors,
}: AdvancedBucketOptionsProps) {
  const [corsInput, setCorsInput] = useState("");
  const corsOrigins = watch("corsOrigins") ?? [];
  const lifecycleTtlDays = watch("lifecycleTtlDays");

  function addCorsOrigin() {
    const trimmed = corsInput.trim();
    if (!trimmed) {
      return;
    }
    try {
      new URL(trimmed);
    } catch {
      return;
    }
    if (corsOrigins.includes(trimmed) || corsOrigins.length >= 10) {
      return;
    }
    setValue("corsOrigins", [...corsOrigins, trimmed]);
    setCorsInput("");
  }

  function removeCorsOrigin(origin: string) {
    setValue(
      "corsOrigins",
      corsOrigins.filter((o) => o !== origin)
    );
  }

  return (
    <Accordion.Root>
      <Accordion.Item>
        <Accordion.Trigger className="flex w-full cursor-pointer items-center gap-1.5 py-2 text-muted-foreground text-sm hover:text-foreground [&[data-panel-open]>svg]:rotate-180">
          Advanced options
          <ChevronDown className="size-3.5" />
        </Accordion.Trigger>
        <Accordion.Panel className="space-y-4 overflow-hidden pt-2 pb-1">
          <div className="space-y-2">
            <Label>Region</Label>
            <Select
              defaultValue={defaultRegion}
              items={REGIONS.map((r) => ({
                value: r.value,
                label: (
                  <span className="flex items-center gap-2">
                    <r.Flag className="size-4 shrink-0" />
                    {r.label}
                  </span>
                ),
              }))}
              onValueChange={(value) => setValue("region", value)}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select a region" />
              </SelectTrigger>
              <SelectContent align="start" alignItemWithTrigger={false}>
                {REGIONS.map((r) => (
                  <SelectItem key={r.value} value={r.value}>
                    <r.Flag className="size-4 shrink-0" />
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Visibility</Label>
            <Select
              defaultValue="public"
              items={VISIBILITY_OPTIONS}
              onValueChange={(value) =>
                setValue(
                  "visibility",
                  value as CreateBucketValues["visibility"]
                )
              }
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
          </div>

          <div className="space-y-2">
            <Label>Cache preset</Label>
            <Select
              defaultValue="standard"
              items={CACHE_PRESETS}
              onValueChange={(value) =>
                setValue(
                  "cachePreset",
                  value as CreateBucketValues["cachePreset"]
                )
              }
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

          <div className="space-y-2">
            <Label>CORS origins</Label>
            <div className="flex gap-2">
              <Input
                onChange={(e) => setCorsInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addCorsOrigin();
                  }
                }}
                placeholder="https://example.com"
                value={corsInput}
              />
              <Button
                disabled={corsOrigins.length >= 10}
                onClick={addCorsOrigin}
                type="button"
                variant="outline"
              >
                Add
              </Button>
            </div>
            {corsOrigins.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {corsOrigins.map((origin) => (
                  <span
                    className="inline-flex items-center gap-0.5 border border-input px-1.5 py-0.5 font-mono text-[10px]"
                    key={origin}
                  >
                    {origin}
                    {/* biome-ignore lint/a11y/useSemanticElements: can't nest <button> in this context */}
                    <span
                      className="cursor-pointer text-muted-foreground hover:text-foreground"
                      onClick={() => removeCorsOrigin(origin)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          removeCorsOrigin(origin);
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
            {errors.corsOrigins && (
              <p className="text-destructive text-xs">
                {errors.corsOrigins.message}
              </p>
            )}
            <p className="text-muted-foreground text-xs">
              Origins allowed to access your files from a browser
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="lifecycleTtlDays">Auto-delete after</Label>
            <div className="flex">
              <Input
                className="rounded-r-none border-r-0"
                id="lifecycleTtlDays"
                max={3650}
                min={1}
                onChange={(e) => {
                  const val = e.target.value;
                  setValue("lifecycleTtlDays", val ? Number(val) : null);
                }}
                placeholder="Never"
                type="number"
                value={lifecycleTtlDays ?? ""}
              />
              <span className="inline-flex items-center border border-input bg-muted px-3 text-muted-foreground text-xs">
                days
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {LIFECYCLE_PRESETS.map((preset) => (
                <button
                  className={`border px-2 py-0.5 text-xs transition-colors ${
                    lifecycleTtlDays === preset.value
                      ? "border-foreground bg-foreground text-background"
                      : "border-input text-muted-foreground hover:border-foreground hover:text-foreground"
                  }`}
                  key={preset.value}
                  onClick={() => setValue("lifecycleTtlDays", preset.value)}
                  type="button"
                >
                  {preset.label}
                </button>
              ))}
              {lifecycleTtlDays !== null && lifecycleTtlDays !== undefined && (
                <button
                  className="border border-input px-2 py-0.5 text-muted-foreground text-xs hover:border-foreground hover:text-foreground"
                  onClick={() => setValue("lifecycleTtlDays", null)}
                  type="button"
                >
                  Clear
                </button>
              )}
            </div>
            {errors.lifecycleTtlDays && (
              <p className="text-destructive text-xs">
                {errors.lifecycleTtlDays.message}
              </p>
            )}
          </div>
        </Accordion.Panel>
      </Accordion.Item>
    </Accordion.Root>
  );
}
