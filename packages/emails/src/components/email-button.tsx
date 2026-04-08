import { Button, Section } from "@react-email/components";
import { button, buttonSection } from "./styles";

interface EmailButtonProps {
  children: React.ReactNode;
  href: string;
}

export function EmailButton({ children, href }: EmailButtonProps) {
  return (
    <Section style={buttonSection}>
      <Button href={href} style={button}>
        {children}
      </Button>
    </Section>
  );
}
