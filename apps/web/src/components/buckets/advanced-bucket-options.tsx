"use client";

import { useState } from "react";
import type { FieldErrors, UseFormRegister, UseFormSetValue, UseFormWatch } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";

interface CreateBucketValues {
  name: string;
  customDomain: string;
  region: string;
  visibility: "public" | "private";
  cachePreset: "no-cache" | "short" | "standard" | "aggressive" | "immutable";
  corsOrigins: string[];
  lifecycleTtlDays: number | null;
}

const CACHE_PRESETS = [
  { value: "no-cache", label: "No cache" },
  { value: "short", label: "Short (1 hour)" },
  { value: "standard", label: "Standard (1 day)" },
  { value: "aggressive", label: "Aggressive (30 days)" },
  { value: "immutable", label: "Immutable (1 year)" },
] as const;

interface AdvancedBucketOptionsProps {
  register: UseFormRegister<CreateBucketValues>;
  setValue: UseFormSetValue<CreateBucketValues>;
  watch: UseFormWatch<CreateBucketValues>;
  errors: FieldErrors<CreateBucketValues>;
}

export function AdvancedBucketOptions({
  setValue,
  watch,
  errors,
}: AdvancedBucketOptionsProps) {
  const [corsInput, setCorsInput] = useState("");
  const corsOrigins = watch("corsOrigins") ?? [];

  function addCorsOrigin() {
    const trimmed = corsInput.trim();
    if (!trimmed) return;
    try {
      new URL(trimmed);
    } catch {
      return;
    }
    if (corsOrigins.includes(trimmed)) return;
    if (corsOrigins.length >= 10) return;
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
    <div className="space-y-4 border-t pt-4">
      <div className="space-y-2">
        <Label>Cache preset</Label>
        <Select
          defaultValue="standard"
          onValueChange={(value) =>
            setValue(
              "cachePreset",
              value as CreateBucketValues["cachePreset"]
            )
          }
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
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
          <div className="flex flex-wrap gap-2">
            {corsOrigins.map((origin) => (
              <span
                className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-1 text-xs"
                key={origin}
              >
                {origin}
                <button
                  className="text-muted-foreground hover:text-foreground"
                  onClick={() => removeCorsOrigin(origin)}
                  type="button"
                >
                  x
                </button>
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
        <Label htmlFor="lifecycleTtlDays">Auto-delete after (days)</Label>
        <Input
          id="lifecycleTtlDays"
          max={3650}
          min={1}
          onChange={(e) => {
            const val = e.target.value;
            setValue("lifecycleTtlDays", val ? Number(val) : null);
          }}
          placeholder="Leave empty to keep files forever"
          type="number"
        />
        {errors.lifecycleTtlDays && (
          <p className="text-destructive text-xs">
            {errors.lifecycleTtlDays.message}
          </p>
        )}
        <p className="text-muted-foreground text-xs">
          Files will be automatically deleted after this many days
        </p>
      </div>
    </div>
  );
}
