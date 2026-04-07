import type { Metadata } from "next";
import { AcceptInvitation } from "@/components/settings/accept-invitation";

export const metadata: Metadata = { title: "Accept Invitation" };

export default async function InvitePage({
  params,
}: {
  params: Promise<{ invitationId: string }>;
}) {
  const { invitationId } = await params;
  return <AcceptInvitation invitationId={invitationId} />;
}
