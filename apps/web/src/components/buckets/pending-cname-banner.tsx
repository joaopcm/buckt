"use client";

import { AlertTriangle } from "lucide-react";
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

interface PendingCnameBannerProps {
  bucketId: string;
  cnameRecord: { name: string; type: string; value: string };
  hasDomainConnect: boolean;
  orgId: string;
}

export function PendingCnameBanner({
  bucketId,
  cnameRecord,
  hasDomainConnect,
  orgId,
}: PendingCnameBannerProps) {
  const { data: membersData } = trpc.org.members.useQuery({ orgId });
  const memberEmails = (membersData?.members ?? []).map(
    (m: { user: { email: string } }) => m.user.email
  );

  return (
    <Card className="bg-amber-500/10 ring-amber-500/20">
      <CardHeader>
        <div className="flex items-center gap-2">
          <AlertTriangle className="size-4 text-amber-600" />
          <CardTitle className="text-sm">
            Your domain isn't pointing to the CDN yet
          </CardTitle>
        </div>
        <CardDescription className="text-xs">
          Add this CNAME record to your DNS provider to start serving files from
          your custom domain.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Type</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Value</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell className="font-mono text-xs">
                {cnameRecord.type}
              </TableCell>
              <TableCell>
                <CopyText
                  className="max-w-xs"
                  persistent
                  value={cnameRecord.name}
                />
              </TableCell>
              <TableCell>
                <CopyText
                  className="max-w-xs"
                  persistent
                  value={cnameRecord.value}
                />
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
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
      </CardContent>
    </Card>
  );
}
