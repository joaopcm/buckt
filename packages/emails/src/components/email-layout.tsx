import { Body, Container, Head, Html, Preview } from "@react-email/components";
import { Logo } from "./logo";
import { body, container } from "./styles";

interface EmailLayoutProps {
  children: React.ReactNode;
  preview: string;
}

export function EmailLayout({ children, preview }: EmailLayoutProps) {
  return (
    <Html lang="en">
      <Head />
      <Preview>{preview}</Preview>
      <Body style={body}>
        <Container style={container}>
          <Logo />
          {children}
        </Container>
      </Body>
    </Html>
  );
}
