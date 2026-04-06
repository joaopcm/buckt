import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from "@react-email/components";

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
    <Html>
      <Head />
      <Preview>
        {inviterName} invited you to join {orgName}
      </Preview>
      <Body style={body}>
        <Container style={container}>
          <Heading style={heading}>Join {orgName}</Heading>
          <Text style={text}>
            {inviterName} has invited you to join <strong>{orgName}</strong> as
            a <strong>{role}</strong>.
          </Text>
          <Section style={buttonSection}>
            <Button href={acceptUrl} style={button}>
              Accept Invitation
            </Button>
          </Section>
          <Hr style={hr} />
          <Text style={footer}>
            If you weren't expecting this invitation, you can ignore this email.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

const body = {
  backgroundColor: "#f6f9fc",
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
};

const container = {
  backgroundColor: "#ffffff",
  margin: "0 auto",
  padding: "40px 20px",
  maxWidth: "480px",
  borderRadius: "8px",
};

const heading = {
  fontSize: "24px",
  fontWeight: "600" as const,
  color: "#1a1a1a",
  margin: "0 0 16px",
};

const text = {
  fontSize: "14px",
  lineHeight: "24px",
  color: "#4a4a4a",
  margin: "0 0 24px",
};

const buttonSection = {
  textAlign: "center" as const,
  margin: "0 0 24px",
};

const button = {
  backgroundColor: "#0a0a0a",
  color: "#ffffff",
  fontSize: "14px",
  fontWeight: "600" as const,
  textDecoration: "none",
  padding: "12px 24px",
  borderRadius: "6px",
};

const hr = {
  borderColor: "#e6e6e6",
  margin: "24px 0",
};

const footer = {
  fontSize: "12px",
  color: "#8a8a8a",
  margin: "0",
};
