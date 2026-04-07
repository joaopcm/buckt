import { authClient } from "@/lib/auth-client";
import { trpc } from "@/lib/trpc/client";

export function useOrgRole(orgId: string) {
  const { data: session } = authClient.useSession();
  const { data: membersData } = trpc.org.members.useQuery({ orgId });

  const userId = session?.user?.id ?? "";
  const currentMember = membersData?.members?.find(
    (m: { userId: string }) => m.userId === userId
  );
  const role = currentMember?.role ?? "member";

  return {
    userId,
    role,
    isOwner: role === "owner",
    isAdmin: role === "owner" || role === "admin",
  };
}
