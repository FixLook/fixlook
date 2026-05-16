import { AppShell } from "@/components/app-shell";
import { requireProfile } from "@/lib/auth";

const masterNav = [
  { href: "/master/dashboard", label: "Dashboard" },
  { href: "/master/orders", label: "Assigned Orders" },
  { href: "/master/profile", label: "Profile" }
];

export default async function MasterLayout({
  children
}: {
  children: React.ReactNode;
}) {
  const profile = await requireProfile("master");

  return (
    <AppShell profile={profile} navItems={masterNav}>
      {children}
    </AppShell>
  );
}
