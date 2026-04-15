"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Check, ExternalLink, Info } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { CopyText } from "@/components/copy-text";
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

const roleArnSchema = z.object({
  roleArn: z
    .string()
    .regex(/^arn:aws:iam::\d{12}:role\/.+$/, "Must be a valid IAM role ARN"),
});

type Step = "label" | "cloudformation" | "role-arn" | "validating" | "done";

export function ConnectAwsForm({ orgId }: { orgId: string }) {
  const router = useRouter();
  const [step, setStep] = useState<Step>("label");
  const [accountId, setAccountId] = useState<string | null>(null);
  const [externalId, setExternalId] = useState("");
  const [label, setLabel] = useState("");
  const [consoleOpened, setConsoleOpened] = useState(false);

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
    },
    onError: (err) => {
      toast.error(err.message);
      setStep("role-arn");
    },
  });

  const roleArnForm = useForm({
    resolver: zodResolver(roleArnSchema),
    defaultValues: { roleArn: "" },
  });

  if (step === "done") {
    return (
      <Card className="max-w-lg">
        <CardContent className="flex flex-col items-center gap-4 pt-8 pb-8">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100 dark:bg-green-900">
            <Check className="h-6 w-6 text-green-600 dark:text-green-400" />
          </div>
          <p className="font-medium">AWS account connected successfully</p>
          <Button onClick={() => router.push(`/org/${orgId}/aws-accounts`)}>
            View accounts
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (step === "validating") {
    return (
      <Card className="max-w-lg">
        <CardContent className="flex flex-col items-center gap-4 pt-8 pb-8">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p className="text-muted-foreground text-sm">
            Validating connection...
          </p>
        </CardContent>
      </Card>
    );
  }

  if (step === "role-arn" && accountId) {
    return (
      <Card className="max-w-lg">
        <CardHeader>
          <CardTitle>Paste Role ARN</CardTitle>
          <CardDescription>
            Copy the Role ARN from your CloudFormation stack outputs
          </CardDescription>
        </CardHeader>
        <CardContent>
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
            <div className="space-y-4">
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
              <div className="flex gap-2">
                <Button
                  onClick={() => setStep("cloudformation")}
                  type="button"
                  variant="outline"
                >
                  Back
                </Button>
                <Button disabled={validateMutation.isPending} type="submit">
                  Validate
                </Button>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>
    );
  }

  if (step === "cloudformation") {
    return (
      <Card className="max-w-lg">
        <CardHeader>
          <CardTitle>Deploy CloudFormation stack</CardTitle>
          <CardDescription>
            Click the button below to open CloudFormation in your AWS Console.
            The External ID and Buckt Account ID will be pre-filled.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Card className="bg-blue-500/10 ring-blue-500/20">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Info className="size-4 text-blue-600" />
                  <CardTitle className="text-sm">
                    What happens when you open the console
                  </CardTitle>
                </div>
                <CardDescription className="text-xs">
                  <ol className="list-inside list-decimal space-y-1">
                    <li>
                      A CloudFormation "Quick Create" page opens with pre-filled
                      parameters
                    </li>
                    <li>
                      Scroll down, check the acknowledgment checkbox, and click
                      "Create stack"
                    </li>
                    <li>Wait for the stack status to show "CREATE_COMPLETE"</li>
                    <li>
                      Go to the Outputs tab and copy the{" "}
                      <strong className="text-foreground">RoleArn</strong> value
                    </li>
                  </ol>
                </CardDescription>
              </CardHeader>
            </Card>
            <div className="space-y-2">
              <Label>External ID</Label>
              <CopyText
                className="rounded-md border px-3 py-2"
                value={externalId}
              />
            </div>
            <Button
              className="w-full"
              onClick={() => {
                window.open(buildQuickCreateUrl(externalId), "_blank");
                setConsoleOpened(true);
              }}
              variant={consoleOpened ? "outline" : "default"}
            >
              <ExternalLink className="mr-1.5 h-4 w-4" />
              Open CloudFormation Console
            </Button>
            <Button
              className="w-full"
              onClick={() => setStep("role-arn")}
              variant={consoleOpened ? "default" : "outline"}
            >
              I&apos;ve deployed the stack
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="max-w-lg">
      <CardHeader>
        <CardTitle>Account details</CardTitle>
        <CardDescription>
          Give this connection a name to identify it later
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            connectMutation.mutate({ orgId, label: label || undefined });
          }}
        >
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="label">Label</Label>
              <Input
                id="label"
                onChange={(e) => setLabel(e.target.value)}
                placeholder="e.g. Production, Staging"
                value={label}
              />
            </div>
            <Button disabled={connectMutation.isPending} type="submit">
              {connectMutation.isPending ? "Creating..." : "Continue"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
