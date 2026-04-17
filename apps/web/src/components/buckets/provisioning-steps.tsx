"use client";

import { Check, Circle, Info, Loader2, Zap } from "lucide-react";
import { ApplyButton } from "@/components/buckets/apply-button";
import { ForwardInstructionsPopover } from "@/components/buckets/forward-instructions-popover";
import { CopyText } from "@/components/copy-text";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { trpc } from "@/lib/trpc/client";

interface DnsRecord {
  applied?: boolean;
  name: string;
  type: string;
  value: string;
}

type StepStatus = "done" | "active" | "pending";

const PLACEHOLDER = "pending-cloudfront-distribution";

function StepIcon({ status }: { status: StepStatus }) {
  if (status === "done") {
    return (
      <div className="flex size-6 shrink-0 items-center justify-center bg-green-500/10">
        <Check className="size-3.5 text-green-500" />
      </div>
    );
  }
  if (status === "active") {
    return (
      <div className="flex size-6 shrink-0 items-center justify-center bg-blue-500/10">
        <Loader2 className="size-3.5 animate-spin text-blue-500" />
      </div>
    );
  }
  return (
    <div className="flex size-6 shrink-0 items-center justify-center bg-muted">
      <Circle className="size-3.5 text-muted-foreground" />
    </div>
  );
}

function deriveStep(records: DnsRecord[]): number {
  if (records.length === 0) {
    return 0;
  }
  const hasPending = records.some((r) => r.value === PLACEHOLDER);
  return hasPending ? 1 : 2;
}

function stepStatus(current: number, target: number): StepStatus {
  if (current > target) {
    return "done";
  }
  if (current === target) {
    return "active";
  }
  return "pending";
}

export function ProvisioningSteps({
  records,
  domain,
  hasDomainConnect,
  orgId,
  bucketId,
}: {
  records: unknown;
  domain: string;
  hasDomainConnect: boolean;
  orgId: string;
  bucketId: string;
}) {
  const dnsRecords = (Array.isArray(records) ? records : []) as DnsRecord[];

  const step = deriveStep(dnsRecords);
  const validationRecords = dnsRecords.filter((r) => r.value !== PLACEHOLDER);
  const domainRecord = dnsRecords.find(
    (r) => r.name === domain && r.value !== PLACEHOLDER
  );
  const rootDomain = domain.split(".").slice(-2).join(".");
  const validationApplied = validationRecords.some((r) => r.applied);

  const { data: membersData } = trpc.org.members.useQuery({ orgId });
  const memberEmails = (membersData?.members ?? []).map(
    (m: { user: { email: string } }) => m.user.email
  );

  function dnsStepStatus(): StepStatus {
    if (validationApplied) {
      return "done";
    }
    if (step === 0) {
      return "pending";
    }
    return stepStatus(step, 1);
  }

  function domainStepDescription(): string {
    if (step < 2) {
      return "Once the certificate is validated, we'll create a CDN distribution and show you the final DNS record to add.";
    }
    if (domainRecord?.applied) {
      return "Domain CNAME was configured automatically via Domain Connect.";
    }
    return "Add this CNAME record to point your domain to the CDN.";
  }

  function domainStepStatus(): StepStatus {
    if (step < 2) {
      return "pending";
    }
    return domainRecord?.applied ? "done" : "active";
  }

  return (
    <div className="space-y-4">
      <Step
        description="We're creating your S3 bucket, SSL certificate, and CDN distribution. This usually takes a minute or two."
        status={step === 0 ? "active" : "done"}
        title="Setting up your bucket"
      />

      <Step
        description={
          validationApplied
            ? "DNS records were configured automatically via Domain Connect."
            : "Add the following DNS records to your provider. The CNAME proves domain ownership for the SSL certificate. The CAA record authorizes Amazon to issue it."
        }
        status={dnsStepStatus()}
        title="Add DNS records"
      >
        {validationApplied ? (
          <AppliedAutomatically />
        ) : (
          validationRecords.length > 0 && (
            <div className="space-y-3">
              <DnsTable
                records={[
                  ...validationRecords,
                  {
                    name: rootDomain,
                    type: "CAA",
                    value: '0 issue "amazon.com"',
                  },
                ]}
              />
              {hasDomainConnect && (
                <Card className="bg-blue-500/10 ring-blue-500/20">
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <Info className="size-4 text-blue-600" />
                      <CardTitle className="text-sm">
                        Add the CAA record manually
                      </CardTitle>
                    </div>
                    <CardDescription className="text-xs">
                      Domain Connect doesn't support CAA records, so "Apply
                      automatically" only sets the CNAME. Add the CAA record
                      above to your DNS provider by hand — without it, Amazon
                      can't issue your SSL certificate.
                    </CardDescription>
                  </CardHeader>
                </Card>
              )}
              <div className="flex items-center gap-2">
                {hasDomainConnect && (
                  <ApplyButton
                    bucketId={bucketId}
                    orgId={orgId}
                    serviceId="acm-validation"
                  />
                )}
                <ForwardInstructionsPopover
                  bucketId={bucketId}
                  memberEmails={memberEmails}
                  orgId={orgId}
                  serviceId="acm-validation"
                />
              </div>
            </div>
          )
        )}
      </Step>

      <Step
        description={
          step >= 1
            ? "We check every 5 minutes. This usually takes a few minutes after you add the DNS record above."
            : "Starts automatically after you add the validation record."
        }
        status={stepStatus(step, 1)}
        title="Certificate validation"
      />

      <Step
        description={domainStepDescription()}
        status={domainStepStatus()}
        title="Point your domain"
      >
        {step >= 2 &&
          domainRecord &&
          (domainRecord.applied ? (
            <AppliedAutomatically />
          ) : (
            <div className="space-y-3">
              <DnsTable records={[domainRecord]} />
              <div className="flex items-center gap-2">
                {hasDomainConnect && (
                  <ApplyButton
                    bucketId={bucketId}
                    orgId={orgId}
                    serviceId="cdn-cname"
                  />
                )}
                <ForwardInstructionsPopover
                  bucketId={bucketId}
                  memberEmails={memberEmails}
                  orgId={orgId}
                  serviceId="cdn-cname"
                />
              </div>
            </div>
          ))}
      </Step>
    </div>
  );
}

function AppliedAutomatically() {
  return (
    <div className="flex items-center gap-2 text-green-600 text-xs">
      <Zap className="size-3.5" />
      Applied automatically via Domain Connect
    </div>
  );
}

function DnsTable({ records }: { records: DnsRecord[] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Type</TableHead>
          <TableHead>Name</TableHead>
          <TableHead>Value</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {records.map((record) => (
          <TableRow key={record.name}>
            <TableCell className="font-mono text-xs">{record.type}</TableCell>
            <TableCell>
              <CopyText className="max-w-xs" persistent value={record.name} />
            </TableCell>
            <TableCell>
              <CopyText className="max-w-xs" persistent value={record.value} />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function Step({
  title,
  description,
  status,
  children,
}: {
  title: string;
  description: string;
  status: StepStatus;
  children?: React.ReactNode;
}) {
  return (
    <Card className={status === "pending" ? "opacity-50" : undefined}>
      <CardHeader>
        <div className="flex items-center gap-3">
          <StepIcon status={status} />
          <div>
            <CardTitle className="text-sm">{title}</CardTitle>
            <CardDescription className="text-xs">{description}</CardDescription>
          </div>
        </div>
      </CardHeader>
      {children && <CardContent>{children}</CardContent>}
    </Card>
  );
}
