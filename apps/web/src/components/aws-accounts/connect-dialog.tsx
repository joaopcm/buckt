"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Check, Copy, ExternalLink } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { env } from "@/env";
import { trpc } from "@/lib/trpc/client";

function buildQuickCreateUrl(externalId: string) {
  const templateUrl = env.NEXT_PUBLIC_CF_TEMPLATE_URL;
  const accountId = env.NEXT_PUBLIC_BUCKT_AWS_ACCOUNT_ID ?? "";
  const params = new URLSearchParams({
    templateURL: templateUrl,
    stackName: "BucktAccess",
    param_BucktAccountId: accountId,
    param_ExternalId: externalId,
  });
  return `https://console.aws.amazon.com/cloudformation/home#/stacks/quickcreate?${params.toString()}`;
}

const labelSchema = z.object({
  label: z.string().max(100).optional(),
});

const roleArnSchema = z.object({
  roleArn: z
    .string()
    .regex(/^arn:aws:iam::\d{12}:role\/.+$/, "Must be a valid IAM role ARN"),
});

type Step = "label" | "cloudformation" | "role-arn" | "validating" | "done";

export function ConnectAwsDialog({
  orgId,
  open,
  onOpenChange,
}: {
  orgId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [step, setStep] = useState<Step>("label");
  const [accountId, setAccountId] = useState<string | null>(null);
  const [externalId, setExternalId] = useState<string>("");

  const utils = trpc.useUtils();

  const connectMutation = trpc.awsAccounts.connect.useMutation({
    onSuccess: (data) => {
      setAccountId(data.id);
      setExternalId(data.externalId);
      setStep("cloudformation");
    },
    onError: (err) => toast.error(err.message),
  });

  const updateMutation = trpc.awsAccounts.update.useMutation();

  const validateMutation = trpc.awsAccounts.validate.useMutation({
    onSuccess: () => {
      setStep("done");
      utils.awsAccounts.list.invalidate({ orgId });
    },
    onError: (err) => {
      toast.error(err.message);
      setStep("role-arn");
    },
  });

  const labelForm = useForm({
    resolver: zodResolver(labelSchema),
    defaultValues: { label: "" },
  });

  const roleArnForm = useForm({
    resolver: zodResolver(roleArnSchema),
    defaultValues: { roleArn: "" },
  });

  function handleClose(v: boolean) {
    if (!v) {
      setStep("label");
      setAccountId(null);
      setExternalId("");
      labelForm.reset();
      roleArnForm.reset();
    }
    onOpenChange(v);
  }

  async function handleCopy(text: string) {
    await navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  }

  return (
    <Dialog onOpenChange={handleClose} open={open}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Connect AWS Account</DialogTitle>
          <DialogDescription>
            {step === "label" && "Give this connection a name (optional)"}
            {step === "cloudformation" &&
              "Deploy the CloudFormation stack in your AWS account"}
            {step === "role-arn" &&
              "Paste the Role ARN from your CloudFormation stack outputs"}
            {step === "validating" && "Validating connection..."}
            {step === "done" && "AWS account connected successfully"}
          </DialogDescription>
        </DialogHeader>

        {step === "label" && (
          <form
            onSubmit={labelForm.handleSubmit((data) =>
              connectMutation.mutate({ orgId, label: data.label || undefined })
            )}
          >
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="label">Label</Label>
                <Input
                  id="label"
                  placeholder="e.g. Production, Staging"
                  {...labelForm.register("label")}
                />
              </div>
            </div>
            <DialogFooter>
              <Button disabled={connectMutation.isPending} type="submit">
                {connectMutation.isPending ? "Creating..." : "Continue"}
              </Button>
            </DialogFooter>
          </form>
        )}

        {step === "cloudformation" && (
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>External ID</Label>
              <div className="flex gap-2">
                <Input
                  className="font-mono text-xs"
                  readOnly
                  value={externalId}
                />
                <Button
                  onClick={() => handleCopy(externalId)}
                  size="icon"
                  variant="outline"
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <p className="text-muted-foreground text-sm">
              Click the button below to open CloudFormation in your AWS Console.
              The External ID and Buckt Account ID will be pre-filled.
            </p>
            <Button
              className="w-full"
              onClick={() => {
                window.open(buildQuickCreateUrl(externalId), "_blank");
              }}
              variant="outline"
            >
              <ExternalLink className="mr-1.5 h-4 w-4" />
              Open CloudFormation Console
            </Button>
            <DialogFooter>
              <Button onClick={() => handleClose(false)} variant="outline">
                Cancel
              </Button>
              <Button onClick={() => setStep("role-arn")}>
                I&apos;ve deployed the stack
              </Button>
            </DialogFooter>
          </div>
        )}

        {step === "role-arn" && accountId && (
          <form
            onSubmit={roleArnForm.handleSubmit(async (data) => {
              setStep("validating");
              await updateMutation.mutateAsync({
                orgId,
                id: accountId,
                roleArn: data.roleArn,
              });
              validateMutation.mutate({ orgId, id: accountId });
            })}
          >
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="roleArn">Role ARN</Label>
                <Input
                  className="font-mono text-xs"
                  id="roleArn"
                  placeholder="arn:aws:iam::123456789012:role/BucktAccess"
                  {...roleArnForm.register("roleArn")}
                />
                {roleArnForm.formState.errors.roleArn && (
                  <p className="text-destructive text-xs">
                    {roleArnForm.formState.errors.roleArn.message}
                  </p>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button
                onClick={() => setStep("cloudformation")}
                variant="outline"
              >
                Back
              </Button>
              <Button disabled={validateMutation.isPending} type="submit">
                Validate
              </Button>
            </DialogFooter>
          </form>
        )}

        {step === "validating" && (
          <div className="flex flex-col items-center gap-4 py-8">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            <p className="text-muted-foreground text-sm">
              Validating connection...
            </p>
          </div>
        )}

        {step === "done" && (
          <div className="flex flex-col items-center gap-4 py-8">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100 dark:bg-green-900">
              <Check className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
            <p className="font-medium">Connected successfully</p>
            <DialogFooter>
              <Button onClick={() => handleClose(false)}>Done</Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
