import { Heading, Section, Text } from "@react-email/components";
import { EmailFooter } from "./components/email-footer";
import { EmailLayout } from "./components/email-layout";
import { heading, paragraph } from "./components/styles";

interface DnsRecord {
  name: string;
  type: string;
  value: string;
}

interface DnsInstructionsEmailProps {
  senderName: string;
  orgName: string;
  domain: string;
  records: DnsRecord[];
}

const cellStyle: React.CSSProperties = {
  border: "1px solid #e4e4e7",
  fontSize: "12px",
  fontFamily: "monospace",
  padding: "8px 12px",
  wordBreak: "break-all",
};

const headerCellStyle: React.CSSProperties = {
  ...cellStyle,
  backgroundColor: "#f4f4f5",
  color: "#52525b",
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  fontSize: "11px",
  fontWeight: 600,
  textTransform: "uppercase" as const,
  letterSpacing: "0.05em",
};

export function DnsInstructionsEmail({
  senderName,
  orgName,
  domain,
  records,
}: DnsInstructionsEmailProps) {
  return (
    <EmailLayout
      preview={`DNS setup instructions for ${domain}`}
    >
      <Heading style={heading}>DNS Setup Instructions</Heading>
      <Text style={paragraph}>
        <strong>{senderName}</strong> from <strong>{orgName}</strong> shared DNS
        setup instructions for <strong>{domain}</strong>.
      </Text>
      <Text style={paragraph}>
        Add the following DNS records at your domain registrar:
      </Text>
      <Section style={{ marginBottom: "28px" }}>
        <table
          cellPadding="0"
          cellSpacing="0"
          style={{
            borderCollapse: "collapse",
            width: "100%",
          }}
        >
          <thead>
            <tr>
              <th style={headerCellStyle}>Type</th>
              <th style={headerCellStyle}>Name</th>
              <th style={headerCellStyle}>Value</th>
            </tr>
          </thead>
          <tbody>
            {records.map((record) => (
              <tr key={`${record.type}-${record.name}`}>
                <td style={cellStyle}>{record.type}</td>
                <td style={cellStyle}>{record.name}</td>
                <td style={cellStyle}>{record.value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Section>
      <EmailFooter>
        These records are required to complete the domain setup for {domain} on
        Buckt. If you have questions, contact the person who sent this email.
      </EmailFooter>
    </EmailLayout>
  );
}
