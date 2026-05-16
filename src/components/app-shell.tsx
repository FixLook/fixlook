import Link from "next/link";
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
                  Sign out
                </Button>
              </form>
            </div>
          </div>
          <nav className="flex gap-2 overflow-x-auto">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium text-slate-600 hover:bg-accent hover:text-dark"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  );
}
