"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  ClipboardList,
  CreditCard,
  LayoutDashboard,
  MessageCircle,
  Plus,
  Star,
  UserRound,
  UsersRound,
  Wrench,
  type LucideIcon
} from "lucide-react";
import { cn } from "@/lib/utils";

const icons: Record<string, LucideIcon> = {
  dashboard: LayoutDashboard,
  messages: MessageCircle,
  orders: ClipboardList,
  ratings: Star,
  profile: UserRound,
  professionals: UsersRound,
  services: Wrench,
  payments: CreditCard
};

export function Navigation({ items }: { items: { href: string; label: string }[] }) {
  const pathname = usePathname();
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    let active = true;
    async function refresh() {
      if (document.visibilityState !== "visible") return;
      try {
        const response = await fetch("/api/messages/unread", { cache: "no-store" });
        if (response.ok) {
          const data = await response.json();
          if (active) setUnread(data.count);
        }
      } catch {
        /* Retry on the next poll. */
      }
    }
    void refresh();
    const timer = setInterval(() => void refresh(), 15000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [pathname]);

  return (
    <nav
      className="flex gap-1.5 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible lg:pb-0"
      aria-label="Hlavná navigácia"
    >
      {items.map((item) => {
        const selected = pathname === item.href || pathname.startsWith(item.href + "/");
        const Icon = item.href.endsWith("/orders/new")
          ? Plus
          : (icons[item.href.split("/").at(-1) ?? ""] ?? LayoutDashboard);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={selected ? "page" : undefined}
            className={cn(
              "flex min-h-11 shrink-0 items-center gap-2.5 whitespace-nowrap rounded-xl px-3 py-3 text-sm font-medium transition-colors lg:gap-3",
              selected
                ? "bg-primary-soft text-primary-strong"
                : "text-slate-600 hover:bg-accent hover:text-dark"
            )}
          >
            <Icon aria-hidden="true" className="h-[18px] w-[18px] shrink-0" />
            <span className="lg:min-w-0 lg:flex-1 lg:whitespace-normal">{item.label}</span>
            {item.href.endsWith("/messages") && unread > 0 && (
              <span
                aria-label={unread + " neprečítaných správ"}
                className="shrink-0 rounded-full bg-primary-strong px-2 py-0.5 text-[11px] font-semibold text-white"
              >
                {unread > 99 ? "99+" : unread}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
