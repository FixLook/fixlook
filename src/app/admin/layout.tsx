import { AppShell } from "@/components/app-shell";
import { requireProfile } from "@/lib/auth";

const adminNav = [
  { href: "/admin/dashboard", label: "Prehľad" },
  { href: "/admin/messages", label: "Správy a podpora" },
  { href: "/admin/orders", label: "Objednávky" },
  { href: "/admin/professionals", label: "Majstri" },
  { href: "/admin/services", label: "Služby" },
  { href: "/admin/payments", label: "Platby" }
];

export default async function AdminLayout({
  children
}: {
  children: React.ReactNode;
}) {
  const profile = await requireProfile("admin");

  return (
    <AppShell profile={profile} navItems={adminNav}>
      {children}
    </AppShell>
  );
}
