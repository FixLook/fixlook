import { Suspense } from "react";
import { LogOut, MapPin } from "lucide-react";
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

const roleLabels = {
  customer: "Zákaznícky účet",
  master: "Účet majstra",
  admin: "Administrácia"
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
  const initials = profile.full_name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((name) => name[0])
    .join("")
    .toUpperCase();
  return (
    <div className="min-h-screen bg-accent lg:grid lg:grid-cols-[248px_minmax(0,1fr)]">
      <a
        href="#obsah"
        className="sr-only z-50 rounded-xl bg-dark px-5 py-3 text-white focus:not-sr-only focus:absolute focus:left-4 focus:top-4"
      >
        Prejsť na obsah
      </a>
      <aside className="border-b bg-white px-4 py-4 sm:px-6 lg:sticky lg:top-0 lg:flex lg:h-screen lg:flex-col lg:overflow-y-auto lg:border-b-0 lg:border-r lg:px-5 lg:py-7">
        <div className="flex items-center justify-between gap-4">
          <BrandLogo />
          <form action={signOutAction} className="lg:hidden">
            <Button type="submit" variant="ghost" size="sm">
              Odhlásiť sa
            </Button>
          </form>
        </div>
        <p className="mb-4 mt-7 hidden px-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground lg:block">
          {roleLabels[profile.role]}
        </p>
        <div className="mt-4 lg:mt-0">
          <Navigation items={navItems} />
        </div>
        <div className="mt-auto hidden border-t pt-5 lg:block">
          <div className="mb-4 flex items-center gap-3 px-2">
            <span
              aria-hidden="true"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-soft text-sm font-semibold text-primary-strong"
            >
              {initials}
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{profile.full_name}</p>
              <p className="mt-0.5 truncate text-xs text-muted-foreground">{profile.city}</p>
            </div>
          </div>
          <form action={signOutAction}>
            <Button type="submit" variant="ghost" className="w-full justify-start text-slate-600">
              <LogOut aria-hidden="true" className="h-4 w-4" /> Odhlásiť sa
            </Button>
          </form>
        </div>
      </aside>
      <div className="min-w-0">
        <header className="hidden items-center justify-between gap-4 border-b bg-white px-8 py-5 lg:flex xl:px-10">
          <div>
            <p className="text-sm font-semibold">Váš priestor vo FixLook</p>
            <p className="mt-1 text-xs text-muted-foreground">{roleLabels[profile.role]}</p>
          </div>
          <span className="flex items-center gap-2 rounded-full border bg-accent px-3 py-2 text-xs text-slate-600">
            <MapPin aria-hidden="true" className="h-3.5 w-3.5" />
            {profile.city}
          </span>
        </header>
        <main
          id="obsah"
          className="account-content mx-auto max-w-7xl px-4 py-7 sm:px-6 sm:py-8 lg:px-8 xl:px-10 xl:py-10"
        >
          <Suspense>
            <RouteNotice />
          </Suspense>
          {children}
        </main>
      </div>
    </div>
  );
}
