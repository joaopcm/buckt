"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc/client";

const createBucketSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  customDomain: z
    .string()
    .min(1, "Domain is required")
    .regex(
      /^([a-z0-9]+(-[a-z0-9]+)*\.)+[a-z]{2,}$/,
      "Invalid domain format (e.g. cdn.example.com)"
    ),
});

type CreateBucketValues = z.infer<typeof createBucketSchema>;

export function CreateBucketForm({ orgId }: { orgId: string }) {
  const router = useRouter();
  const utils = trpc.useUtils();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CreateBucketValues>({
    resolver: zodResolver(createBucketSchema),
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
