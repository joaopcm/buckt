"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { AdvancedBucketOptions } from "@/components/buckets/advanced-bucket-options";
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

const REGIONS = [
  { value: "us-east-1", label: "US East (N. Virginia)" },
  { value: "us-west-2", label: "US West (Oregon)" },
  { value: "eu-west-1", label: "Europe (Ireland)" },
  { value: "eu-central-1", label: "Europe (Frankfurt)" },
  { value: "ap-southeast-1", label: "Asia Pacific (Singapore)" },
  { value: "ap-northeast-1", label: "Asia Pacific (Tokyo)" },
] as const;

const TIMEZONE_REGION_MAP: Record<string, string> = {
  "America/New_York": "us-east-1",
  "America/Chicago": "us-east-1",
  "America/Denver": "us-west-2",
  "America/Los_Angeles": "us-west-2",
  "America/Anchorage": "us-west-2",
  "America/Sao_Paulo": "us-east-1",
  "America/Toronto": "us-east-1",
  "Europe/London": "eu-west-1",
  "Europe/Dublin": "eu-west-1",
  "Europe/Paris": "eu-central-1",
  "Europe/Berlin": "eu-central-1",
  "Europe/Amsterdam": "eu-central-1",
  "Europe/Madrid": "eu-west-1",
  "Europe/Rome": "eu-central-1",
  "Europe/Lisbon": "eu-west-1",
  "Asia/Tokyo": "ap-northeast-1",
  "Asia/Seoul": "ap-northeast-1",
  "Asia/Shanghai": "ap-southeast-1",
  "Asia/Singapore": "ap-southeast-1",
  "Asia/Kolkata": "ap-southeast-1",
  "Australia/Sydney": "ap-southeast-1",
};

function getClosestRegion(): string {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return TIMEZONE_REGION_MAP[tz] ?? "us-east-1";
  } catch {
    return "us-east-1";
  }
}

const createBucketSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  customDomain: z
    .string()
    .min(1, "Domain is required")
    .regex(
      /^([a-z0-9]+(-[a-z0-9]+)*\.)+[a-z]{2,}$/,
      "Invalid domain format (e.g. cdn.example.com)"
    ),
  region: z.string().default("us-east-1"),
  visibility: z.enum(["public", "private"]).default("public"),
  cachePreset: z
    .enum(["no-cache", "short", "standard", "aggressive", "immutable"])
    .default("standard"),
  corsOrigins: z.array(z.string().url()).max(10).default([]),
  lifecycleTtlDays: z.number().int().min(1).max(3650).nullable().default(null),
});

type CreateBucketValues = z.infer<typeof createBucketSchema>;

export function CreateBucketForm({ orgId }: { orgId: string }) {
  const router = useRouter();
  const utils = trpc.useUtils();
  const [showAdvanced, setShowAdvanced] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<CreateBucketValues>({
    resolver: zodResolver(createBucketSchema),
    defaultValues: {
      region: getClosestRegion(),
      visibility: "public",
      cachePreset: "standard",
      corsOrigins: [],
      lifecycleTtlDays: null,
    },
  });

  const createBucket = trpc.buckets.create.useMutation({
    onSuccess: (bucket) => {
      utils.buckets.list.invalidate({ orgId });
      utils.buckets.count.invalidate({ orgId });
      router.push(`/org/${orgId}/buckets/${bucket.id}`);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  function onSubmit(values: CreateBucketValues) {
    createBucket.mutate({ ...values, orgId });
  }

  return (
    <Card className="max-w-lg">
      <CardHeader>
        <CardTitle>Bucket details</CardTitle>
      </CardHeader>
      <CardContent>
        <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input id="name" placeholder="My CDN" {...register("name")} />
            {errors.name && (
              <p className="text-destructive text-xs">{errors.name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="customDomain">Custom domain</Label>
            <Input
              id="customDomain"
              placeholder="cdn.example.com"
              {...register("customDomain")}
            />
            {errors.customDomain && (
              <p className="text-destructive text-xs">
                {errors.customDomain.message}
              </p>
            )}
            <p className="text-muted-foreground text-xs">
              The domain where your files will be served
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="region">Region</Label>
            <Select
              defaultValue={getClosestRegion()}
              onValueChange={(value) => setValue("region", value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a region" />
              </SelectTrigger>
              <SelectContent>
                {REGIONS.map((r) => (
                  <SelectItem key={r.value} value={r.value}>
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Visibility</Label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2">
                <input
                  checked={watch("visibility") === "public"}
                  name="visibility"
                  onChange={() => setValue("visibility", "public")}
                  type="radio"
                  value="public"
                />
                <span className="text-sm">Public</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  checked={watch("visibility") === "private"}
                  name="visibility"
                  onChange={() => setValue("visibility", "private")}
                  type="radio"
                  value="private"
                />
                <span className="text-sm">Private</span>
              </label>
            </div>
            <p className="text-muted-foreground text-xs">
              {watch("visibility") === "public"
                ? "Files served openly via your custom domain"
                : "Files require authentication to access"}
            </p>
          </div>

          <div>
            <button
              className="text-muted-foreground text-sm underline"
              onClick={() => setShowAdvanced(!showAdvanced)}
              type="button"
            >
              {showAdvanced ? "Hide advanced options" : "Show advanced options"}
            </button>
          </div>

          {showAdvanced && (
            <AdvancedBucketOptions
              errors={errors}
              register={register}
              setValue={setValue}
              watch={watch}
            />
          )}

          <Button
            className="w-full"
            disabled={createBucket.isPending}
            type="submit"
          >
            {createBucket.isPending ? "Creating..." : "Create bucket"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
