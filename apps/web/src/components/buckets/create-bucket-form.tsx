"use client";

import {
  ALLOWED_REGIONS,
  type AllowedRegion,
  OPTIMIZATION_MODES,
} from "@buckt/shared";
import { zodResolver } from "@hookform/resolvers/zod";
import { Check, Loader2 } from "lucide-react";
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
import { useDebounce } from "@/hooks/use-debounce";
import { trpc } from "@/lib/trpc/client";

const TIMEZONE_REGION_MAP: Record<string, string> = {
  "America/New_York": "us-east-1",
  "America/Chicago": "us-east-1",
  "America/Denver": "us-west-2",
  "America/Los_Angeles": "us-west-2",
  "America/Anchorage": "us-west-2",
  "America/Toronto": "ca-central-1",
  "America/Vancouver": "us-west-2",
  "America/Sao_Paulo": "sa-east-1",
  "America/Argentina/Buenos_Aires": "sa-east-1",
  "America/Bogota": "us-east-1",
  "America/Mexico_City": "us-east-1",
  "Europe/London": "eu-west-2",
  "Europe/Dublin": "eu-west-1",
  "Europe/Paris": "eu-west-3",
  "Europe/Berlin": "eu-central-1",
  "Europe/Amsterdam": "eu-central-1",
  "Europe/Madrid": "eu-west-3",
  "Europe/Rome": "eu-central-1",
  "Europe/Lisbon": "eu-west-1",
  "Europe/Stockholm": "eu-north-1",
  "Europe/Helsinki": "eu-north-1",
  "Europe/Oslo": "eu-north-1",
  "Europe/Copenhagen": "eu-north-1",
  "Europe/Warsaw": "eu-central-1",
  "Asia/Tokyo": "ap-northeast-1",
  "Asia/Seoul": "ap-northeast-2",
  "Asia/Shanghai": "ap-northeast-2",
  "Asia/Singapore": "ap-southeast-1",
  "Asia/Kolkata": "ap-south-1",
  "Asia/Mumbai": "ap-south-1",
  "Asia/Dubai": "me-south-1",
  "Asia/Riyadh": "me-south-1",
  "Asia/Bahrain": "me-south-1",
  "Australia/Sydney": "ap-southeast-2",
  "Australia/Melbourne": "ap-southeast-2",
  "Australia/Perth": "ap-southeast-1",
  "Pacific/Auckland": "ap-southeast-2",
  "Africa/Johannesburg": "af-south-1",
  "Africa/Cairo": "me-south-1",
  "Africa/Lagos": "af-south-1",
  "Africa/Nairobi": "af-south-1",
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

  const { data: awsAccountsData } = trpc.awsAccounts.list.useQuery({
    orgId,
    limit: 50,
  });
  const activeAccounts =
    awsAccountsData?.items.filter((a) => a.status === "active") ?? [];
  const [selectedAwsAccount, setSelectedAwsAccount] = useState<string>("");

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
      awsAccountId: selectedAwsAccount || undefined,
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
          {activeAccounts.length > 0 && (
            <div className="space-y-2">
              <Label htmlFor="awsAccount">AWS Account</Label>
              <Select
                onValueChange={setSelectedAwsAccount}
                value={selectedAwsAccount}
              >
                <SelectTrigger id="awsAccount">
                  <SelectValue placeholder="Buckt-managed (default)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Buckt-managed (default)</SelectItem>
                  {activeAccounts.map((account) => (
                    <SelectItem key={account.id} value={account.id}>
                      {account.label || account.awsAccountId}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-muted-foreground text-xs">
                {selectedAwsAccount
                  ? "Bucket will be created in your AWS account"
                  : "Bucket will be created in Buckt's infrastructure"}
              </p>
            </div>
          )}

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
