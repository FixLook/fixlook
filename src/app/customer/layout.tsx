import { AppShell } from "@/components/app-shell";
import { requireProfile } from "@/lib/auth";

const customerNav = [
  { href: "/customer/dashboard", label: "Prehľad" },
  { href: "/customer/messages", label: "Správy a podpora" },
  { href: "/customer/orders/new", label: "Nová objednávka" },
  { href: "/customer/ratings", label: "Hodnotenia" },
  { href: "/customer/profile", label: "Profil" }
];

export default async function CustomerLayout({
  children
}: {
  children: React.ReactNode;
}) {
  const profile = await requireProfile("customer");

  return (
    <AppShell profile={profile} navItems={customerNav}>
      {children}
    </AppShell>
  );
}
