import { AppShell } from "@/components/app-shell";
import { requireProfile } from "@/lib/auth";

const masterNav = [
  { href: "/master/dashboard", label: "Prehľad" },
  { href: "/master/messages", label: "Správy a podpora" },
  { href: "/master/orders", label: "Moje zákazky" },
  { href: "/master/profile", label: "Profil" }
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
