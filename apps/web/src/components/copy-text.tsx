"use client";

import { Check, ClipboardCopy } from "lucide-react";
import { useEffect, useRef, useState } from "react";
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
    <button
      className={cn(
        "flex cursor-pointer items-center gap-2 text-left font-mono text-xs",
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
    </button>
  );
}
