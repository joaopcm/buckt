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
            </TableRow>
          </TableHeader>
          <TableBody>
            {dnsRecords.map((record) => (
              <TableRow key={record.name}>
                <TableCell className="font-mono text-xs">
                  {record.type}
                </TableCell>
                <TableCell>
                  <CopyableCell value={record.name} />
                </TableCell>
                <TableCell>
                  <CopyableCell value={record.value} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function CopyableCell({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    navigator.clipboard.writeText(value);
    setCopied(true);
  }

  return (
    <button
      className="flex w-full cursor-pointer items-center gap-2 text-left font-mono text-xs"
      onClick={handleCopy}
      type="button"
    >
      <span className="max-w-xs truncate">{value}</span>
      {copied ? (
        <Check className="size-3 shrink-0 text-green-500" />
      ) : (
        <Copy className="size-3 shrink-0 text-muted-foreground" />
      )}
    </button>
  );
}
