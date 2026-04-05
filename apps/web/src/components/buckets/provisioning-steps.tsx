import { Check, Circle, Loader2 } from "lucide-react";
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

interface DnsRecord {
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

export function ProvisioningSteps({ records }: { records: unknown }) {
  const dnsRecords = (Array.isArray(records) ? records : []) as DnsRecord[];

  const step = deriveStep(dnsRecords);
  const validationRecords = dnsRecords.filter((r) => r.value !== PLACEHOLDER);
  const domainRecord = dnsRecords.find((r) => r.value === PLACEHOLDER);

  return (
    <div className="space-y-4">
      <Step
        description="Add the following CNAME record to your DNS provider. This proves you own the domain so we can issue an SSL certificate."
        status={step === 0 ? "pending" : stepStatus(step, 1)}
        title="Add DNS validation record"
      >
        {validationRecords.length > 0 && (
          <DnsTable records={validationRecords} />
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
        description={
          step >= 2
            ? "Add this CNAME record to point your domain to the CDN."
            : "Once the certificate is validated, we'll create a CDN distribution and show you the final DNS record to add."
        }
        status={step >= 2 ? "active" : "pending"}
        title="Point your domain"
      >
        {step >= 2 && domainRecord && <DnsTable records={[domainRecord]} />}
      </Step>
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
