import { UserProfile } from "@clerk/nextjs";
import { PageHeader } from "@/components/page-header";

export default function SettingsPage() {
  return (
    <>
      <PageHeader title="Profile & settings" description="Manage your name, email and password." />
      <UserProfile
        routing="path"
        path="/settings"
        appearance={{ elements: { rootBox: "w-full", cardBox: "w-full max-w-full shadow-none border" } }}
      />
    </>
  );
}
