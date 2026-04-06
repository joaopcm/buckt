import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  pixelBasedPreset,
  Section,
  Tailwind,
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
      <Tailwind config={{ presets: [pixelBasedPreset] }}>
        <Head />
        <Preview>
          {inviterName} invited you to join {orgName}
        </Preview>
        <Body className="bg-gray-100 font-sans">
          <Container className="mx-auto max-w-xl rounded-lg bg-white px-5 py-10">
            <Heading className="mb-4 font-semibold text-2xl text-gray-900">
              Join {orgName}
            </Heading>
            <Text className="mb-6 text-gray-600 text-sm leading-6">
              {inviterName} has invited you to join <strong>{orgName}</strong>{" "}
              as a <strong>{role}</strong>.
            </Text>
            <Section className="mb-6 text-center">
              <Button
                className="rounded-md bg-gray-950 px-6 py-3 font-semibold text-sm text-white no-underline"
                href={acceptUrl}
              >
                Accept Invitation
              </Button>
            </Section>
            <Hr className="my-6 border-gray-200" />
            <Text className="m-0 text-gray-400 text-xs">
              If you weren't expecting this invitation, you can ignore this
              email.
            </Text>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}
