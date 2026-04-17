"use client";

import { ChevronDown, X } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const PERMISSION_GROUPS = [
  {
    label: "Buckets",
    permissions: ["buckets:read", "buckets:write", "buckets:delete"],
  },
  {
    label: "Files",
    permissions: ["files:read", "files:write", "files:delete"],
  },
  { label: "Keys", permissions: ["keys:read", "keys:write"] },
  {
    label: "AWS Accounts",
    permissions: [
      "aws-accounts:read",
      "aws-accounts:write",
      "aws-accounts:delete",
    ],
  },
] as const;

const ALL_PERMISSIONS = PERMISSION_GROUPS.flatMap((g) => g.permissions);

export function PermissionSelect({
  value,
  onChange,
}: {
  value: string[];
  onChange: (value: string[]) => void;
}) {
  function toggle(permission: string) {
    onChange(
      value.includes(permission)
        ? value.filter((p) => p !== permission)
        : [...value, permission]
    );
  }

  function remove(permission: string) {
    onChange(value.filter((p) => p !== permission));
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex min-h-8 w-full cursor-pointer items-center gap-1 border border-input bg-transparent px-2.5 py-1 text-left text-xs dark:bg-input/30">
        <div className="flex flex-1 flex-wrap gap-1">
          {value.length === 0 && (
            <span className="text-muted-foreground">Select permissions...</span>
          )}
          {value.map((perm) => (
            <span
              className="inline-flex items-center gap-0.5 border border-input px-1.5 py-0.5 font-mono text-[10px]"
              key={perm}
            >
              {perm}
              {/* biome-ignore lint/a11y/useSemanticElements: can't nest <button> inside DropdownMenuTrigger */}
              <span
                className="cursor-pointer text-muted-foreground hover:text-foreground"
                onClick={(e) => {
                  e.stopPropagation();
                  remove(perm);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.stopPropagation();
                    remove(perm);
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
          checked={value.length === ALL_PERMISSIONS.length}
          className="cursor-pointer py-1.5 font-medium"
          onCheckedChange={() => {
            onChange(
              value.length === ALL_PERMISSIONS.length
                ? []
                : [...ALL_PERMISSIONS]
            );
          }}
        >
          All permissions
        </DropdownMenuCheckboxItem>
        <DropdownMenuSeparator />
        {PERMISSION_GROUPS.map((group) => {
          const allSelected = group.permissions.every((p) => value.includes(p));
          return (
            <DropdownMenuGroup key={group.label}>
              <DropdownMenuCheckboxItem
                checked={allSelected}
                className="cursor-pointer py-1.5 text-muted-foreground"
                onCheckedChange={() => {
                  const perms = [...group.permissions];
                  onChange(
                    allSelected
                      ? value.filter((p) => !perms.includes(p as never))
                      : [...new Set([...value, ...perms])]
                  );
                }}
              >
                {group.label}
              </DropdownMenuCheckboxItem>
              {group.permissions.map((perm) => (
                <DropdownMenuCheckboxItem
                  checked={value.includes(perm)}
                  className="cursor-pointer py-1.5"
                  key={perm}
                  onCheckedChange={() => toggle(perm)}
                >
                  <span className="font-mono">{perm}</span>
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuGroup>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
