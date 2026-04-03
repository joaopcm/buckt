import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { AppSidebar } from "@/components/app-sidebar";
import { Providers } from "@/components/providers";
import { Separator } from "@/components/ui/separator";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { auth } from "@/lib/auth";

export default async function DashboardLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ orgId: string }>;
}) {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session) {
    redirect("/login");
  }

  const { orgId } = await params;

  return (
    <Providers>
      <SidebarProvider>
        <AppSidebar orgId={orgId} />
        <SidebarInset>
          <header className="flex h-14 shrink-0 items-center gap-2 border-b px-6">
            <SidebarTrigger className="-ml-2" />
            <Separator className="h-4" orientation="vertical" />
          </header>
          <main className="flex-1 p-6">{children}</main>
        </SidebarInset>
      </SidebarProvider>
    </Providers>
  );
}
