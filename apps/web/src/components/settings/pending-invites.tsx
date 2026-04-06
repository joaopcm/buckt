"use client";

import { toast } from "sonner";
import { DateDisplay } from "@/components/date-display";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc/client";

export function PendingInvites({
  orgId,
  isAdmin,
}: {
  orgId: string;
  isAdmin: boolean;
}) {
  const utils = trpc.useUtils();
  const { data: invitations, isPending } = trpc.org.invitations.useQuery({
    orgId,
  });

  const cancelInvite = trpc.org.cancelInvite.useMutation({
    onSuccess: () => {
      toast.success("Invitation cancelled");
      utils.org.invitations.invalidate({ orgId });
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  if (isPending) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Pending Invites</CardTitle>
          <CardDescription>Invitations awaiting acceptance</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <Skeleton className="h-10 w-full" key={i} />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const pending = invitations?.filter(
    (inv: { status: string }) => inv.status === "pending"
  );

  if (!pending?.length) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Pending Invites</CardTitle>
        <CardDescription>Invitations awaiting acceptance</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {pending.map(
            (inv: {
              id: string;
              email: string;
              role: string;
              createdAt: Date;
            }) => (
              <div className="flex items-center justify-between" key={inv.id}>
                <div className="flex items-center gap-3">
                  <div>
                    <p className="font-medium text-xs">{inv.email}</p>
                    <DateDisplay
                      className="text-muted-foreground text-xs"
                      date={inv.createdAt}
                    />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className="capitalize" variant="outline">
                    {inv.role}
                  </Badge>
                  {isAdmin && (
                    <Button
                      disabled={cancelInvite.isPending}
                      onClick={() =>
                        cancelInvite.mutate({ invitationId: inv.id, orgId })
                      }
                      size="sm"
                      variant="destructive"
                    >
                      Cancel
                    </Button>
                  )}
                </div>
              </div>
            )
          )}
        </div>
      </CardContent>
    </Card>
  );
}
