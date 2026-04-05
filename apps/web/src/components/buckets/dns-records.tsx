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
                  <CopyText
                    className="max-w-xs"
                    persistent
                    value={record.name}
                  />
                </TableCell>
                <TableCell>
                  <CopyText
                    className="max-w-xs"
                    persistent
                    value={record.value}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
