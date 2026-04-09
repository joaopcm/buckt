"use client";

import { ChevronDown, X } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { trpc } from "@/lib/trpc/client";

export function BucketSelect({
  orgId,
  value,
  onChange,
}: {
  orgId: string;
  value: string[] | null;
  onChange: (value: string[] | null) => void;
}) {
  const { data } = trpc.buckets.list.useQuery({ orgId, limit: 100 });
  const bucketList = data?.items ?? [];

  const isAllBuckets = value === null;

  function toggle(bucketId: string) {
    if (isAllBuckets) {
      onChange([bucketId]);
    } else if (value.includes(bucketId)) {
      const next = value.filter((id) => id !== bucketId);
      onChange(next.length === 0 ? null : next);
    } else {
      onChange([...value, bucketId]);
    }
  }

  function remove(bucketId: string) {
    if (isAllBuckets) {
      return;
    }
    const next = value.filter((id) => id !== bucketId);
    onChange(next.length === 0 ? null : next);
  }

  function getBucketName(id: string) {
    return bucketList.find((b) => b.id === id)?.name ?? id;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex min-h-8 w-full cursor-pointer items-center gap-1 border border-input bg-transparent px-2.5 py-1 text-left text-xs dark:bg-input/30">
        <div className="flex flex-1 flex-wrap gap-1">
          {isAllBuckets && (
            <span className="text-muted-foreground">All buckets</span>
          )}
          {!isAllBuckets &&
            value.map((id) => (
              <span
                className="inline-flex items-center gap-0.5 border border-input px-1.5 py-0.5 font-mono text-[10px]"
                key={id}
              >
                {getBucketName(id)}
                {/* biome-ignore lint/a11y/useSemanticElements: can't nest <button> inside DropdownMenuTrigger */}
                <span
                  className="cursor-pointer text-muted-foreground hover:text-foreground"
                  onClick={(e) => {
                    e.stopPropagation();
                    remove(id);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.stopPropagation();
                      remove(id);
                    }
                  }}
                  role="button"
                  tabIndex={0}
                >
                  <X className="size-2.5" />
                </span>
              </span>
            ))}
        </div>
        <ChevronDown className="size-3.5 shrink-0 text-muted-foreground" />
      </DropdownMenuTrigger>

      <DropdownMenuContent align="start" className="w-(--anchor-width)">
        <DropdownMenuCheckboxItem
          checked={isAllBuckets}
          className="cursor-pointer py-1.5 font-medium"
          onCheckedChange={() => {
            onChange(isAllBuckets ? [] : null);
          }}
        >
          All buckets
        </DropdownMenuCheckboxItem>
        <DropdownMenuSeparator />
        {bucketList.map((bucket) => (
          <DropdownMenuCheckboxItem
            checked={isAllBuckets || value.includes(bucket.id)}
            className="cursor-pointer py-1.5"
            key={bucket.id}
            onCheckedChange={() => toggle(bucket.id)}
          >
            <span className="font-mono">{bucket.name}</span>
          </DropdownMenuCheckboxItem>
        ))}
        {bucketList.length === 0 && (
          <div className="px-2 py-1.5 text-muted-foreground text-xs">
            No buckets found
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
