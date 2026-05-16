import { AppShell } from "@/components/app-shell";
import { requireProfile } from "@/lib/auth";

const customerNav = [
  { href: "/customer/dashboard", label: "Dashboard" },
  { href: "/customer/orders/new", label: "New Order" },
  { href: "/customer/ratings", label: "Ratings" },
  { href: "/customer/profile", label: "Profile" }
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
