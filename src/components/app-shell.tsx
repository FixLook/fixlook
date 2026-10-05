import { Suspense } from "react";
import { RouteNotice } from "./route-notice";
import { Navigation } from "./navigation";
import { signOutAction } from "@/actions/auth";
import { BrandLogo } from "@/components/brand-logo";
import { Button } from "@/components/ui/button";
import type { Database } from "@/lib/database.types";

type Profile = Database["public"]["Tables"]["profiles"]["Row"];

export type NavItem = {
  href: string;
  label: string;
};

export function AppShell({
  profile,
  navItems,
  children
}: {
  profile: Profile;
  navItems: NavItem[];
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-accent">
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between gap-4">
            <BrandLogo />
            <div className="flex items-center gap-3">
              <span className="hidden text-sm text-muted-foreground sm:block">
                {profile.full_name}
              </span>
              <form action={signOutAction}>
                <Button type="submit" variant="outline" size="sm">
                  Odhlásiť sa
                </Button>
              </form>
            </div>
          </div>
          <Navigation items={navItems} />
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <Suspense><RouteNotice /></Suspense>
        {children}
      </main>
    </div>
  );
}
