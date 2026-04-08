import { Heading, Text } from "@react-email/components";
import { EmailButton } from "./components/email-button";
import { EmailFooter } from "./components/email-footer";
import { EmailLayout } from "./components/email-layout";
import { heading, paragraph } from "./components/styles";

interface ResetPasswordEmailProps {
  resetUrl: string;
}

export function ResetPasswordEmail({ resetUrl }: ResetPasswordEmailProps) {
  return (
    <EmailLayout preview="Reset your Buckt password">
      <Heading style={heading}>Reset your password</Heading>
      <Text style={paragraph}>
        We received a request to reset your password. Click the button below to
        choose a new one. This link expires in 15 minutes.
      </Text>
      <EmailButton href={resetUrl}>Reset Password</EmailButton>
      <EmailFooter>
        If you didn&apos;t request a password reset, you can safely ignore this
        email.
      </EmailFooter>
    </EmailLayout>
  );
}
