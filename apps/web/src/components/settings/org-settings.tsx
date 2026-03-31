"use client"

import { authClient } from "@/lib/auth-client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Skeleton } from "@/components/ui/skeleton"

export function OrgSettings({ orgId }: { orgId: string }) {
  const { data: org, isPending: orgLoading } = authClient.useActiveOrganization()
  const { data: members, isPending: membersLoading } = authClient.organization.listMembers({
    query: { organizationId: orgId },
  })

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
              <p className="text-sm text-muted-foreground font-mono">{org?.slug}</p>
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
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {members?.data?.map((member) => (
                <div key={member.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar className="size-8">
                      <AvatarFallback className="text-xs">
                        {member.user.name?.[0]?.toUpperCase() ?? "?"}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-medium">{member.user.name}</p>
                      <p className="text-xs text-muted-foreground">{member.user.email}</p>
                    </div>
                  </div>
                  <span className="text-xs font-medium text-muted-foreground capitalize px-2 py-1 rounded-md bg-muted">
                    {member.role}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
