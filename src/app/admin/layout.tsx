import { AppShell } from "@/components/app-shell";
import { requireProfile } from "@/lib/auth";

const adminNav = [
  { href: "/admin/dashboard", label: "Dashboard" },
  { href: "/admin/orders", label: "Orders" },
  { href: "/admin/professionals", label: "Professionals" },
  { href: "/admin/services", label: "Services" },
  { href: "/admin/payments", label: "Payments" }
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
