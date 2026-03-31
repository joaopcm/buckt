"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { LayoutDashboard, HardDrive, Settings, CreditCard, Key } from "lucide-react"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { UserNav } from "@/components/user-nav"
import { cn } from "@/lib/utils"

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Buckets", href: "/buckets", icon: HardDrive },
  { name: "API Keys", href: "/settings/keys", icon: Key },
  { name: "Settings", href: "/settings", icon: Settings },
  { name: "Billing", href: "/billing", icon: CreditCard },
]

export function AppSidebar({ orgId }: { orgId: string }) {
  const pathname = usePathname()

  function isActive(href: string) {
    const fullPath = `/org/${orgId}${href}`
    if (href === "/dashboard") return pathname === fullPath
    return pathname.startsWith(fullPath)
  }

  return (
    <Sidebar>
      <SidebarHeader className="border-b px-4 py-3">
        <Link href={`/org/${orgId}/dashboard`} className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-foreground text-background text-xs font-bold">
            B
          </div>
          <span className="text-base font-bold tracking-tight">buckt</span>
        </Link>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Platform</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navigation.map((item) => (
                <SidebarMenuItem key={item.name}>
                  <Link
                    href={`/org/${orgId}${item.href}`}
                    className={cn(
                      "flex w-full items-center gap-2 rounded-md p-2 text-xs transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                      isActive(item.href) && "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
                    )}
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
  )
}
