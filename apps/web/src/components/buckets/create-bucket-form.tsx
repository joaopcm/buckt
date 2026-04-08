"use client";

import {
  ALLOWED_REGIONS,
  type AllowedRegion,
  OPTIMIZATION_MODES,
} from "@buckt/shared";
import { zodResolver } from "@hookform/resolvers/zod";
import { Check, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { AdvancedBucketOptions } from "@/components/buckets/advanced-bucket-options";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useDebounce } from "@/hooks/use-debounce";
import { trpc } from "@/lib/trpc/client";

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

function getClosestRegion(): AllowedRegion {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return (TIMEZONE_REGION_MAP[tz] as AllowedRegion) ?? "us-east-1";
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
  region: z.enum(ALLOWED_REGIONS).default("us-east-1"),
  visibility: z.enum(["public", "private"]).default("public"),
  cachePreset: z
    .enum(["no-cache", "short", "standard", "aggressive", "immutable"])
    .default("standard"),
  corsOrigins: z.array(z.string().url()).max(10).default([]),
  lifecycleTtlDays: z.number().int().min(1).max(3650).nullable().default(null),
  optimizationMode: z.enum(OPTIMIZATION_MODES).default("none"),
});

type CreateBucketValues = z.output<typeof createBucketSchema>;

const DOMAIN_REGEX = /^([a-z0-9]+(-[a-z0-9]+)*\.)+[a-z]{2,}$/;

export function CreateBucketForm({ orgId }: { orgId: string }) {
  const router = useRouter();
  const utils = trpc.useUtils();
  const defaultRegion = getClosestRegion();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<CreateBucketValues>({
    resolver: zodResolver(createBucketSchema) as never,
    defaultValues: {
      region: defaultRegion,
      visibility: "public",
      cachePreset: "standard",
      corsOrigins: [],
      lifecycleTtlDays: null,
      optimizationMode: "none",
    },
  });

  const domainValue = watch("customDomain") ?? "";
  const debouncedDomain = useDebounce(domainValue, 500);
  const isValidDomain = DOMAIN_REGEX.test(debouncedDomain);

  const dcCheck = trpc.domainConnect.check.useQuery(
    { domain: debouncedDomain },
    { enabled: isValidDomain }
  );

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
    createBucket.mutate({
      ...values,
      orgId,
      domainConnectProvider: dcCheck.data?.supported
        ? dcCheck.data.providerHost
        : undefined,
    });
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
            {isValidDomain && dcCheck.isFetching && (
              <p className="flex items-center gap-1.5 text-muted-foreground text-xs">
                <Loader2 className="size-3 animate-spin" />
                Checking DNS provider...
              </p>
            )}
            {isValidDomain && dcCheck.data?.supported && (
              <p className="flex items-center gap-1.5 text-green-600 text-xs">
                <Check className="size-3" />
                {dcCheck.data.providerName} supports automatic DNS setup
              </p>
            )}
            {!(
              (isValidDomain && dcCheck.data?.supported) ||
              dcCheck.isFetching
            ) && (
              <p className="text-muted-foreground text-xs">
                The domain where your files will be served
              </p>
            )}
          </div>

          <AdvancedBucketOptions
            defaultRegion={defaultRegion}
            errors={errors}
            setValue={setValue}
            watch={watch}
          />

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
