import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  // Second line of defence on top of middleware.
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");
  return <AppShell>{children}</AppShell>;
}
