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
    <Html lang="en">
      <Head />
      <Preview>
        {inviterName} invited you to join {orgName}
      </Preview>
      <Body style={body}>
        <Container style={container}>
          <Section style={logoSection}>
            <table cellPadding="0" cellSpacing="0" role="presentation">
              <tr>
                <td style={logoBox}>B</td>
                <td style={logoText}>buckt</td>
              </tr>
            </table>
          </Section>
          <Heading style={heading}>Join {orgName}</Heading>
          <Text style={paragraph}>
            <strong>{inviterName}</strong> has invited you to join{" "}
            <strong>{orgName}</strong> as a <strong>{role}</strong>.
          </Text>
          <Section style={buttonSection}>
            <Button href={acceptUrl} style={button}>
              Accept Invitation
            </Button>
          </Section>
          <Hr style={divider} />
          <Text style={footer}>
            If you weren't expecting this invitation, you can safely ignore this
            email.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

const body: React.CSSProperties = {
  backgroundColor: "#f4f4f5",
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  margin: "0",
  padding: "40px 0",
};

const container: React.CSSProperties = {
  backgroundColor: "#ffffff",
  border: "1px solid #e4e4e7",
  borderRadius: "12px",
  margin: "0 auto",
  maxWidth: "460px",
  padding: "48px 40px",
};

const logoSection: React.CSSProperties = {
  marginBottom: "32px",
};

const logoBox: React.CSSProperties = {
  backgroundColor: "#0a0a0a",
  color: "#ffffff",
  fontSize: "13px",
  fontWeight: 700,
  height: "28px",
  lineHeight: "28px",
  textAlign: "center",
  width: "28px",
};

const logoText: React.CSSProperties = {
  fontSize: "16px",
  fontWeight: 700,
  letterSpacing: "-0.025em",
  paddingLeft: "8px",
};

const heading: React.CSSProperties = {
  color: "#0a0a0a",
  fontSize: "22px",
  fontWeight: 600,
  letterSpacing: "-0.02em",
  lineHeight: "28px",
  margin: "0 0 12px",
};

const paragraph: React.CSSProperties = {
  color: "#52525b",
  fontSize: "14px",
  lineHeight: "24px",
  margin: "0 0 28px",
};

const buttonSection: React.CSSProperties = {
  marginBottom: "28px",
};

const button: React.CSSProperties = {
  backgroundColor: "#0a0a0a",
  borderRadius: "6px",
  color: "#ffffff",
  display: "inline-block",
  fontSize: "14px",
  fontWeight: 600,
  lineHeight: "1",
  padding: "12px 28px",
  textAlign: "center",
  textDecoration: "none",
};

const divider: React.CSSProperties = {
  borderColor: "#e4e4e7",
  margin: "0 0 20px",
};

const footer: React.CSSProperties = {
  color: "#a1a1aa",
  fontSize: "12px",
  lineHeight: "18px",
  margin: "0",
};
