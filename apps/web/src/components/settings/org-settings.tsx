"use client";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { authClient } from "@/lib/auth-client";

export function OrgSettings({ orgId }: { orgId: string }) {
  const { data: org, isPending: orgLoading } =
    authClient.useActiveOrganization();
  const { data: members, isPending: membersLoading } =
    authClient.organization.listMembers({
      query: { organizationId: orgId },
    });

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Organization</CardTitle>
          <CardDescription>Your organization details</CardDescription>
        </CardHeader>
        <CardContent>
          {orgLoading ? (
            <Skeleton className="h-6 w-48" />
          ) : (
            <div className="space-y-1">
              <p className="font-medium">{org?.name}</p>
              <p className="font-mono text-muted-foreground text-sm">
                {org?.slug}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Members</CardTitle>
          <CardDescription>People in your organization</CardDescription>
        </CardHeader>
        <CardContent>
          {membersLoading ? (
            <div className="space-y-3">
              {[1, 2].map((i) => (
                <Skeleton className="h-10 w-full" key={i} />
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {members?.data?.map((member) => (
                <div
                  className="flex items-center justify-between"
                  key={member.id}
                >
                  <div className="flex items-center gap-3">
                    <Avatar className="size-8">
                      <AvatarFallback className="text-xs">
                        {member.user.name?.[0]?.toUpperCase() ?? "?"}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium text-sm">{member.user.name}</p>
                      <p className="text-muted-foreground text-xs">
                        {member.user.email}
                      </p>
                    </div>
                  </div>
                  <span className="rounded-md bg-muted px-2 py-1 font-medium text-muted-foreground text-xs capitalize">
                    {member.role}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
