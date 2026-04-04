"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";
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

export function DnsRecords({ records }: { records: unknown }) {
  if (!(records && Array.isArray(records)) || records.length === 0) {
    return null;
  }

  const dnsRecords = records as DnsRecord[];

  return (
    <Card>
      <CardHeader>
        <CardTitle>DNS Configuration</CardTitle>
        <CardDescription>
          Add these records to your DNS provider to complete setup
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Type</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Value</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {dnsRecords.map((record) => (
              <TableRow key={record.name}>
                <TableCell className="font-mono text-xs">
                  {record.type}
                </TableCell>
                <TableCell className="font-mono text-xs">
                  {record.name}
                </TableCell>
                <TableCell className="max-w-xs truncate font-mono text-xs">
                  {record.value}
                </TableCell>
                <TableCell>
                  <CopyButton value={record.value} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <button
      className="flex size-7 cursor-pointer items-center justify-center text-muted-foreground hover:text-foreground"
      onClick={handleCopy}
      type="button"
    >
      {copied ? <Check className="size-3" /> : <Copy className="size-3" />}
    </button>
  );
}
