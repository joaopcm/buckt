import type { Metadata } from "next";
import { ProfileSettings } from "@/components/settings/profile-settings";

export const metadata: Metadata = { title: "Profile" };

export default function ProfilePage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-bold text-2xl tracking-tight">Profile</h1>
        <p className="mt-1 text-muted-foreground text-sm">
          Manage your personal account
        </p>
      </div>
      <ProfileSettings />
    </div>
  );
}
