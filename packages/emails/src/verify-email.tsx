import { Heading, Text } from "@react-email/components";
import { EmailButton } from "./components/email-button";
import { EmailFooter } from "./components/email-footer";
import { EmailLayout } from "./components/email-layout";
import { heading, paragraph } from "./components/styles";

interface VerifyEmailEmailProps {
  verificationUrl: string;
}

export function VerifyEmailEmail({ verificationUrl }: VerifyEmailEmailProps) {
  return (
    <EmailLayout preview="Verify your Buckt email">
      <Heading style={heading}>Verify your email</Heading>
      <Text style={paragraph}>
        Click the button below to verify your email address and get started with
        Buckt. This link expires in 24 hours.
      </Text>
      <EmailButton href={verificationUrl}>Verify Email</EmailButton>
      <EmailFooter>
        If you didn&apos;t create a Buckt account, you can safely ignore this
        email.
      </EmailFooter>
    </EmailLayout>
  );
}
