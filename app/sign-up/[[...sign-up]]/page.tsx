import { SignUp } from "@clerk/nextjs";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { AuthShell } from "@/components/auth-shell";

export default async function Page() {
  const { userId } = await auth();
  if (userId) redirect("/dashboard"); // already signed in

  return (
    <AuthShell>
      <SignUp
        forceRedirectUrl="/dashboard"
        appearance={{
          variables: { colorPrimary: "#29418e", borderRadius: "0.625rem" },
          elements: { cardBox: "shadow-sm border" },
        }}
      />
    </AuthShell>
  );
}