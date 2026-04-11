import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { AppSidebar } from "@/components/app-sidebar";
import { PageContainer } from "@/components/page-container";
import { Providers } from "@/components/providers";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { auth } from "@/lib/auth";
import { ShortcutProvider } from "@/lib/shortcuts";
import { GlobalShortcuts } from "@/lib/shortcuts/global-shortcuts";

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
      <ShortcutProvider>
        <GlobalShortcuts />
        <SidebarProvider>
          <AppSidebar orgId={orgId} />
          <SidebarInset>
            <header className="flex h-14 shrink-0 items-center border-b px-6">
              <SidebarTrigger />
            </header>
            <main className="flex-1">
              <PageContainer>{children}</PageContainer>
            </main>
          </SidebarInset>
        </SidebarProvider>
      </ShortcutProvider>
    </Providers>
  );
}
