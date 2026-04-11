import { Body, Container, Head, Html, Preview } from "@react-email/components";
import { Logo } from "./logo";
import { body, container } from "./styles";

interface EmailLayoutProps {
  children: React.ReactNode;
  preview: string;
  wide?: boolean;
}

export function EmailLayout({ children, preview, wide }: EmailLayoutProps) {
  const containerStyle = wide ? { ...container, maxWidth: "600px" } : container;

  return (
    <Html lang="en">
      <Head />
      <Preview>{preview}</Preview>
      <Body style={body}>
        <Container style={containerStyle}>
          <Logo />
          {children}
        </Container>
      </Body>
    </Html>
  );
}
