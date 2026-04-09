import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { ORG_COOKIE_NAME } from "@/utils/org-cookie";

export default async function RootPage() {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session) {
    redirect("/login");
  }

  const orgs = await auth.api.listOrganizations({ headers: await headers() });

  if (!orgs || orgs.length === 0) {
    redirect("/signup");
  }

  const cookieStore = await cookies();
  const lastOrgId = cookieStore.get(ORG_COOKIE_NAME)?.value;
  const targetOrg = lastOrgId && orgs.find((o) => o.id === lastOrgId);

  redirect(`/org/${targetOrg ? targetOrg.id : orgs[0].id}/dashboard`);
}
