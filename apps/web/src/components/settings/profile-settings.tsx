"use client";

import { ProfileImageCard } from "@/components/settings/profile-image-card";
import { ProfileNameCard } from "@/components/settings/profile-name-card";
import { ProfilePasswordCard } from "@/components/settings/profile-password-card";

export function ProfileSettings() {
  return (
    <div className="space-y-6">
      <ProfileImageCard />
      <ProfileNameCard />
      <ProfilePasswordCard />
    </div>
  );
}
