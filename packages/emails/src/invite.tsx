import { Heading, Text } from "@react-email/components";
import { EmailButton } from "./components/email-button";
import { EmailFooter } from "./components/email-footer";
import { EmailLayout } from "./components/email-layout";
import { heading, paragraph } from "./components/styles";

interface InviteEmailProps {
  acceptUrl: string;
  inviterName: string;
  orgName: string;
  role: string;
}

export function InviteEmail({
  orgName,
  inviterName,
  role,
  acceptUrl,
}: InviteEmailProps) {
  return (
    <EmailLayout preview={`${inviterName} invited you to join ${orgName}`}>
      <Heading style={heading}>Join {orgName}</Heading>
      <Text style={paragraph}>
        <strong>{inviterName}</strong> has invited you to join{" "}
        <strong>{orgName}</strong> as a <strong>{role}</strong>.
      </Text>
      <EmailButton href={acceptUrl}>Accept Invitation</EmailButton>
      <EmailFooter>
        If you weren&apos;t expecting this invitation, you can safely ignore
        this email.
      </EmailFooter>
    </EmailLayout>
  );
}
