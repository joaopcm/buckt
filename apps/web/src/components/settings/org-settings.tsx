"use client";

import { renameOrgSchema } from "@buckt/shared";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import type { z } from "zod";
import { InviteMemberDialog } from "@/components/settings/invite-member-dialog";
import { MemberRow } from "@/components/settings/member-row";
import { PendingInvites } from "@/components/settings/pending-invites";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useOrgRole } from "@/hooks/use-org-role";
import { trpc } from "@/lib/trpc/client";

type RenameValues = z.infer<typeof renameOrgSchema>;

export function OrgSettings({ orgId }: { orgId: string }) {
  const [inviteOpen, setInviteOpen] = useState(false);
  const {
    userId: currentUserId,
    role: currentUserRole,
    isAdmin,
  } = useOrgRole(orgId);

  const { data: org, isPending: orgLoading } = trpc.org.get.useQuery({
    orgId,
  });
  const { data: membersData, isPending: membersLoading } =
    trpc.org.members.useQuery({ orgId });

  return (
    <div className="space-y-6">
      <OrgNameCard
        isAdmin={isAdmin}
        loading={orgLoading}
        org={org}
        orgId={orgId}
      />

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Members</CardTitle>
            <CardDescription>People in your organization</CardDescription>
          </div>
          {isAdmin && (
            <Button onClick={() => setInviteOpen(true)} size="sm">
              <Plus className="mr-1 size-4" />
              Invite
            </Button>
          )}
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
              {membersData?.members?.map(
                (member: {
                  id: string;
                  role: string;
                  user: { id: string; name: string; email: string };
                }) => (
                  <MemberRow
                    currentUserId={currentUserId ?? ""}
                    currentUserRole={currentUserRole}
                    key={member.id}
                    member={member}
                    orgId={orgId}
                  />
                )
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <PendingInvites isAdmin={isAdmin} orgId={orgId} />

      <InviteMemberDialog
        onOpenChange={setInviteOpen}
        open={inviteOpen}
        orgId={orgId}
      />
    </div>
  );
}

function OrgNameCard({
  orgId,
  org,
  loading,
  isAdmin,
}: {
  orgId: string;
  org: { name: string; slug: string } | null | undefined;
  loading: boolean;
  isAdmin: boolean;
}) {
  const utils = trpc.useUtils();

  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
    reset,
  } = useForm<RenameValues>({
    resolver: zodResolver(renameOrgSchema),
    values: org ? { name: org.name } : undefined,
  });

  const rename = trpc.org.rename.useMutation({
    onSuccess: (updated) => {
      toast.success("Organization renamed");
      utils.org.get.invalidate({ orgId });
      if (updated) {
        reset({ name: updated.name });
      }
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  function onSubmit(values: RenameValues) {
    rename.mutate({ ...values, orgId });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Organization</CardTitle>
        <CardDescription>Your organization details</CardDescription>
      </CardHeader>
      <CardContent>
        {loading && <Skeleton className="h-6 w-48" />}
        {!loading && isAdmin && (
          <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
            <div className="space-y-2">
              <Label htmlFor="org-name">Name</Label>
              <Input id="org-name" {...register("name")} />
              {errors.name && (
                <p className="text-destructive text-xs">
                  {errors.name.message}
                </p>
              )}
            </div>
            <Button disabled={!isDirty || rename.isPending} type="submit">
              {rename.isPending ? "Saving..." : "Save"}
            </Button>
          </form>
        )}
        {!(loading || isAdmin) && <p className="font-medium">{org?.name}</p>}
      </CardContent>
    </Card>
  );
}
