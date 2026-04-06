"use client";

import { ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

const PAGE_SIZES = [10, 20, 50] as const;

export function Pagination({
  start,
  end,
  total,
  limit,
  onLimitChange,
  hasPreviousPage,
  hasNextPage,
  onPreviousPage,
  onNextPage,
}: {
  start: number;
  end: number;
  total: number;
  limit: number;
  onLimitChange: (limit: number) => void;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
  onPreviousPage: () => void;
  onNextPage: () => void;
}) {
  return (
    <div className="flex items-center justify-between text-muted-foreground text-xs">
      <span>
        Showing {start}–{end} of {total}
      </span>
      <div className="flex items-center gap-2">
        <div className="relative">
          <select
            className="h-7 cursor-pointer appearance-none border border-input bg-transparent pr-7 pl-2 text-xs"
            onChange={(e) => onLimitChange(Number(e.target.value))}
            value={limit}
          >
            {PAGE_SIZES.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute top-1/2 right-2 size-3 -translate-y-1/2 text-muted-foreground" />
        </div>
        <Button
          disabled={!hasPreviousPage}
          onClick={onPreviousPage}
          size="icon-sm"
          variant="outline"
        >
          <ChevronLeft className="size-4" />
        </Button>
        <Button
          disabled={!hasNextPage}
          onClick={onNextPage}
          size="icon-sm"
          variant="outline"
        >
          <ChevronRight className="size-4" />
        </Button>
      </div>
    </div>
  );
}
