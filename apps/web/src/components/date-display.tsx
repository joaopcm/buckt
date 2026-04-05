"use client";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const LOCAL_TZ = Intl.DateTimeFormat().resolvedOptions().timeZone;

function formatDateTime(date: Date): string {
  return date.toLocaleString(undefined, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function formatWithTZ(date: Date, timeZone: string): string {
  return date.toLocaleString(undefined, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    timeZone,
  });
}

export function DateDisplay({
  date,
  className,
}: {
  date: string | Date;
  className?: string;
}) {
  const d = typeof date === "string" ? new Date(date) : date;

  return (
    <TooltipProvider delay={250}>
      <Tooltip>
        <TooltipTrigger className={className}>
          {formatDateTime(d)}
        </TooltipTrigger>
        <TooltipContent sideOffset={8}>
          <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 font-mono text-xs">
            <span className="text-muted-foreground">{LOCAL_TZ}</span>
            <span>{formatWithTZ(d, LOCAL_TZ)}</span>
            <span className="text-muted-foreground">UTC</span>
            <span>{formatWithTZ(d, "UTC")}</span>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
