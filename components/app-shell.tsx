"use client";

import { useState } from "react";
import Link from "next/link";
import { SignOutButton, UserButton, useUser } from "@clerk/nextjs";
import { GraduationCap, LogOut, Menu, X } from "lucide-react";
import { NavLinks } from "@/components/nav-links";
import { Button } from "@/components/ui/button";

function Brand() {
  return (
    <Link href="/dashboard" className="flex items-center gap-2 font-semibold">
      <span className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
        <GraduationCap className="h-4 w-4" />
      </span>
      StudyBuddy
    </Link>
  );
}

function LogoutButton({ className }: { className?: string }) {
  return (
    <SignOutButton redirectUrl="/">
      <Button variant="ghost" className={className}>
        <LogOut /> Log out
      </Button>
    </SignOutButton>
  );
}
function AccountLink() {
  const { user, isLoaded } = useUser();
  const name = user?.fullName || user?.username || user?.primaryEmailAddress?.emailAddress || "Your account";
  return (
    <Link
      href="/settings"
      className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-secondary"
    >
      {isLoaded && user?.imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={user.imageUrl} alt="" className="h-8 w-8 shrink-0 rounded-full" />
      ) : (
        <span className="h-8 w-8 shrink-0 rounded-full bg-secondary" />
      )}
      <span className="truncate">{isLoaded ? name : "Your account"}</span>
    </Link>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[256px_1fr]">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-screen flex-col border-r bg-card p-4 lg:flex">
        <div className="px-2 pb-6 pt-1"><Brand /></div>
        <NavLinks />
        <div className="mt-auto border-t pt-3">
          <AccountLink />
          <LogoutButton className="w-full justify-start text-muted-foreground" />
        </div>
      </aside>

      {/* Mobile / tablet top bar */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b bg-card px-4 py-3 lg:hidden">
        <Brand />
        <div className="flex items-center gap-2">
          <UserButton />
          <Button variant="ghost" size="icon" aria-label={open ? "Close menu" : "Open menu"} onClick={() => setOpen(!open)}>
            {open ? <X /> : <Menu />}
          </Button>
        </div>
      </header>
      {open && (
        <div className="border-b bg-card p-3 lg:hidden">
          <NavLinks onNavigate={() => setOpen(false)} />
          <div className="mt-2 border-t pt-2">
            <LogoutButton className="w-full justify-start text-muted-foreground" />
          </div>
        </div>
      )}

      <main className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 lg:px-10">{children}</main>
    </div>
  );
}