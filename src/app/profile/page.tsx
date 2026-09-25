"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { ProfileEditor, type ProfileTab } from "./profile-editor";

export default function ProfilePage() {
  return (
    <Suspense fallback={<main className="edit-profile-page"><div className="profile-loading">กำลังโหลดโปรไฟล์...</div></main>}>
      <ProfilePageContent />
    </Suspense>
  );
}

function ProfilePageContent() {
  const requestedTab = useSearchParams().get("tab");
  const initialTab: ProfileTab = requestedTab === "health" || requestedTab === "preferences" ? requestedTab : "personal";
  return <ProfileEditor initialTab={initialTab} />;
}
