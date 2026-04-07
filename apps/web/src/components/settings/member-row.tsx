"use client";

import { Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { trpc } from "@/lib/trpc/client";

interface MemberRowProps {
  currentUserId: string;
  currentUserRole: string;
  member: {
    id: string;
    role: string;
    user: { id: string; name: string; email: string };
  };
  orgId: string;
}

export function MemberRow({
  member,
  currentUserId,
  currentUserRole,
  orgId,
}: MemberRowProps) {
  const [removeOpen, setRemoveOpen] = useState(false);
  const utils = trpc.useUtils();

  const isOwner = currentUserRole === "owner";
  const isAdmin = currentUserRole === "owner" || currentUserRole === "admin";
  const isSelf = member.user.id === currentUserId;
  const isMemberOwner = member.role === "owner";
  const canRemove = isAdmin && !isSelf && !isMemberOwner;
  const canChangeRole = isOwner && !isMemberOwner;

  const removeMember = trpc.org.removeMember.useMutation({
    onSuccess: () => {
      toast.success("Member removed");
      utils.org.members.invalidate({ orgId });
      setRemoveOpen(false);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const updateRole = trpc.org.updateRole.useMutation({
    onSuccess: () => {
      toast.success("Role updated");
      utils.org.members.invalidate({ orgId });
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  return (
    <>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Avatar className="size-8">
            <AvatarFallback className="text-xs">
              {member.user.name?.[0]?.toUpperCase() ?? "?"}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="font-medium text-sm">
              {member.user.name}
              {isSelf && (
                <span className="text-muted-foreground text-xs"> (you)</span>
              )}
            </p>
            <p className="text-muted-foreground text-xs">{member.user.email}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {canChangeRole ? (
            <Select
              onValueChange={(role) =>
                updateRole.mutate({
                  memberId: member.id,
                  role: role as "admin" | "member",
                  orgId,
                })
              }
              value={member.role}
            >
              <SelectTrigger className="capitalize" size="sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent alignItemWithTrigger={false}>
                <SelectItem value="member">Member</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
              </SelectContent>
            </Select>
          ) : (
            <Badge className="capitalize" variant="secondary">
              {member.role}
            </Badge>
          )}
          {canRemove && (
            <Button
              onClick={() => setRemoveOpen(true)}
              size="sm"
              variant="ghost"
            >
              <Trash2 className="size-4 text-muted-foreground" />
            </Button>
          )}
        </div>
      </div>

      <ConfirmDialog
        confirmLabel="Remove"
        confirmValue={member.user.name}
        description={
          <>
            This will remove <strong>{member.user.name}</strong> from the
            organization. They will lose access immediately.
          </>
        }
        destructive
        loading={removeMember.isPending}
        onConfirm={() => removeMember.mutate({ memberId: member.id, orgId })}
        onOpenChange={setRemoveOpen}
        open={removeOpen}
        title="Remove member"
      />
    </>
  );
}
