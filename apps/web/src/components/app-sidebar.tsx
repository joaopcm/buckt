"use client";

import {
  CreditCard,
  HardDrive,
  Key,
  LayoutDashboard,
  Settings,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { UserNav } from "@/components/user-nav";
import { trpc } from "@/lib/trpc/client";
import { cn } from "@/lib/utils";

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Buckets", href: "/buckets", icon: HardDrive },
  { name: "API Keys", href: "/keys", icon: Key },
  { name: "Settings", href: "/settings", icon: Settings },
  { name: "Billing", href: "/billing", icon: CreditCard },
];

export function AppSidebar({ orgId }: { orgId: string }) {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const utils = trpc.useUtils();
  const { data: plan } = trpc.org.plan.useQuery({ orgId });

  const prefetchMap: Record<string, () => void> = {
    "/buckets": () => utils.buckets.list.prefetch({ orgId }),
    "/keys": () => utils.keys.list.prefetch({ orgId }),
    "/settings": () => {
      utils.org.get.prefetch({ orgId });
      utils.org.members.prefetch({ orgId });
    },
  };

  useEffect(() => {
    setMounted(true);
  }, []);

  function isActive(href: string) {
    if (!mounted) {
      return false;
    }
    const fullPath = `/org/${orgId}${href}`;
    if (href === "/dashboard") {
      return pathname === fullPath;
    }
    return pathname.startsWith(fullPath);
  }

  return (
    <Sidebar>
      <div className="flex h-14 shrink-0 items-center border-b px-4">
        <Link
          className="flex items-center gap-2"
          href={`/org/${orgId}/dashboard`}
        >
          <div className="flex h-7 w-7 items-center justify-center bg-primary font-bold text-primary-foreground text-xs">
            B
          </div>
          <span className="font-bold text-base tracking-tight">buckt</span>
        </Link>
        {plan && (
          <Badge className="ml-auto text-[10px] uppercase" variant="outline">
            {plan}
          </Badge>
        )}
      </div>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Platform</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navigation.map((item) => (
                <SidebarMenuItem key={item.name}>
                  <Link
                    className={cn(
                      "flex w-full items-center gap-2 p-2 text-xs transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                      isActive(item.href) &&
                        "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
                    )}
                    href={`/org/${orgId}${item.href}`}
                    onMouseEnter={() => prefetchMap[item.href]?.()}
                  >
                    <item.icon className="size-4 shrink-0" />
                    <span>{item.name}</span>
                  </Link>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t">
        <UserNav />
      </SidebarFooter>
    </Sidebar>
  );
}
