import { Hr, Text } from "@react-email/components";
import { divider, footer } from "./styles";

interface EmailFooterProps {
  children: React.ReactNode;
}

export function EmailFooter({ children }: EmailFooterProps) {
  return (
    <>
      <Hr style={divider} />
      <Text style={footer}>{children}</Text>
    </>
  );
}
