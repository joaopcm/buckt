import { Badge } from "@/components/ui/badge";

const statusConfig = {
  pending: {
    label: "Pending",
    className: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
  },
  provisioning: {
    label: "Provisioning",
    className: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  },
  active: {
    label: "Active",
    className: "bg-green-500/10 text-green-500 border-green-500/20",
  },
  failed: {
    label: "Failed",
    className: "bg-red-500/10 text-red-500 border-red-500/20",
  },
  deleting: {
    label: "Deleting",
    className: "bg-muted text-muted-foreground border-border",
  },
} as const;

type BucketStatus = keyof typeof statusConfig;

export function StatusBadge({ status }: { status: BucketStatus }) {
  const config = statusConfig[status];
  return (
    <Badge className={config.className} variant="outline">
      {config.label}
    </Badge>
  );
}
