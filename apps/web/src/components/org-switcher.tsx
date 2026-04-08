"use client";

import { Check, ChevronsUpDown, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { CreateOrgDialog } from "@/components/create-org-dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { authClient } from "@/lib/auth-client";
import { setOrgCookie } from "@/lib/org-cookie";
import { trpc } from "@/lib/trpc/client";

const WHITESPACE = /\s+/;
const NON_ALPHANUMERIC = /[^a-zA-Z0-9]/;

function getInitials(name: string) {
  return name
    .split(WHITESPACE)
    .map((w) => w.replace(NON_ALPHANUMERIC, "").charAt(0))
    .filter(Boolean)
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function OrgSwitcher({ orgId }: { orgId: string }) {
  const router = useRouter();
  const { data: orgs, isPending } = authClient.useListOrganizations();
  const orgIds = orgs?.map((o) => o.id) ?? [];
  const { data: planMap } = trpc.org.plans.useQuery(
    { orgIds },
    { enabled: orgIds.length > 0 }
  );
  const [createOpen, setCreateOpen] = useState(false);

  useEffect(() => {
    setOrgCookie(orgId);
  }, [orgId]);

  const currentOrg = orgs?.find((o) => o.id === orgId);

  function switchOrg(id: string) {
    if (id === orgId) {
      return;
    }
    setOrgCookie(id);
    router.push(`/org/${id}/dashboard`);
  }

  if (isPending) {
    return (
      <div className="flex w-full items-center gap-2">
        <Skeleton className="size-6 shrink-0" />
        <Skeleton className="h-4 w-24" />
      </div>
    );
  }

  return (
    <div className="flex w-full min-w-0">
      <DropdownMenu>
        <DropdownMenuTrigger className="flex w-full min-w-0 cursor-pointer items-center gap-2 rounded-none p-2 text-left text-xs transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground data-popup-open:bg-sidebar-accent data-popup-open:text-sidebar-accent-foreground">
          <Avatar className="size-6 shrink-0">
            <AvatarImage src={currentOrg?.logo ?? undefined} />
            <AvatarFallback className="text-[10px]">
              {currentOrg ? getInitials(currentOrg.name) : "?"}
            </AvatarFallback>
          </Avatar>
          <span className="truncate font-medium">
            {currentOrg?.name ?? "Organization"}
          </span>
          <ChevronsUpDown className="ml-auto size-3.5 shrink-0 text-muted-foreground" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-(--anchor-width)">
          <DropdownMenuGroup>
            <DropdownMenuLabel>Organizations</DropdownMenuLabel>
            {orgs?.map((org) => (
              <DropdownMenuItem key={org.id} onClick={() => switchOrg(org.id)}>
                <Avatar className="size-5 shrink-0">
                  <AvatarImage src={org.logo ?? undefined} />
                  <AvatarFallback className="text-[8px]">
                    {getInitials(org.name)}
                  </AvatarFallback>
                </Avatar>
                <span className="truncate">{org.name}</span>
                {planMap?.[org.id] && planMap[org.id] !== "free" && (
                  <Badge
                    className="ml-auto text-[9px] uppercase"
                    variant="outline"
                  >
                    {planMap[org.id]}
                  </Badge>
                )}
                {org.id === orgId && <Check className="size-3 shrink-0" />}
              </DropdownMenuItem>
            ))}
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            <DropdownMenuItem onClick={() => setCreateOpen(true)}>
              <Plus className="size-4" />
              Create organization
            </DropdownMenuItem>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
      <CreateOrgDialog onOpenChange={setCreateOpen} open={createOpen} />
    </div>
  );
}
