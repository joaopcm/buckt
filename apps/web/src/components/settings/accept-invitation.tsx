"use client";

import { Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { authClient } from "@/lib/auth-client";

export function AcceptInvitation({ invitationId }: { invitationId: string }) {
  const router = useRouter();
  const { data: session, isPending: sessionLoading } = authClient.useSession();
  const [status, setStatus] = useState<"loading" | "error">("loading");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (sessionLoading) {
      return;
    }

    if (!session) {
      router.replace(
        `/login?redirectTo=${encodeURIComponent(`/invite/${invitationId}`)}`
      );
      return;
    }

    authClient.organization
      .acceptInvitation({ invitationId })
      .then((result) => {
        if (result.error) {
          setStatus("error");
          setErrorMessage(
            result.error.message ?? "Failed to accept invitation"
          );
          return;
        }
        const orgId = result.data?.member?.organizationId;
        router.replace(orgId ? `/org/${orgId}/dashboard` : "/");
      })
      .catch(() => {
        setStatus("error");
        setErrorMessage("Failed to accept invitation");
      });
  }, [session, sessionLoading, invitationId, router]);

  if (status === "error") {
    return (
      <Card className="max-w-sm">
        <CardHeader>
          <CardTitle>Invitation Error</CardTitle>
          <CardDescription>
            {errorMessage ||
              "This invitation may have expired or been cancelled."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild className="w-full">
            <Link href="/">Go to Home</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="flex items-center justify-center">
      <Loader2 className="size-6 animate-spin text-muted-foreground" />
    </div>
  );
}
