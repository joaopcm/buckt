"use client";

import { Check, ClipboardCopy } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export function CopyText({
  value,
  className,
  persistent = false,
}: {
  value: string;
  className?: string;
  persistent?: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  function handleCopy() {
    navigator.clipboard.writeText(value);
    setCopied(true);
    if (!persistent) {
      timerRef.current = setTimeout(() => setCopied(false), 2000);
    }
  }

  return (
    <TooltipProvider delay={500}>
      <Tooltip>
        <TooltipTrigger
          className={cn(
            "flex cursor-pointer items-center gap-2 px-1 py-0.5 text-left font-mono text-xs hover:bg-foreground/10",
            className
          )}
          onClick={handleCopy}
          type="button"
        >
          <span className="truncate">{value}</span>
          {copied ? (
            <Check className="size-3 shrink-0 text-green-500" />
          ) : (
            <ClipboardCopy className="size-3 shrink-0 text-muted-foreground" />
          )}
        </TooltipTrigger>
        <TooltipContent sideOffset={8}>
          {copied ? "Copied!" : "Click to copy"}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
