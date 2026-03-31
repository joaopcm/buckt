import { redirect } from "next/navigation"
import { headers } from "next/headers"
import { auth } from "@/lib/auth"

export default async function RootPage() {
  const session = await auth.api.getSession({ headers: await headers() })

  if (!session) {
    redirect("/login")
  }

  const orgs = await auth.api.listOrganizations({ headers: await headers() })

  if (orgs && orgs.length > 0) {
    redirect(`/org/${orgs[0].id}/dashboard`)
  }

  redirect("/signup")
}
