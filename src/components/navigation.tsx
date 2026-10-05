"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
export function Navigation({ items }: { items: { href: string; label: string }[] }) {
  const pathname = usePathname();
  const [unread, setUnread] = useState(0);
  useEffect(() => {
    let active = true;
    async function refresh() {
      if (document.visibilityState !== "visible") return;
      try { const response = await fetch("/api/messages/unread", { cache: "no-store" }); if (response.ok) { const data = await response.json(); if (active) setUnread(data.count); } } catch { /* Retry on the next poll. */ }
    }
    void refresh(); const timer = setInterval(() => void refresh(), 15000);
    return () => { active = false; clearInterval(timer); };
  }, [pathname]);
  return <nav className="flex gap-2 overflow-x-auto" aria-label="Hlavná navigácia">{items.map(item => {
    const selected = pathname === item.href || pathname.startsWith(item.href + "/");
    return <Link key={item.href} href={item.href} aria-current={selected ? "page" : undefined} className={`whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium ${selected ? "bg-emerald-50 text-emerald-900" : "text-slate-600 hover:bg-accent"}`}>{item.label}{item.href.endsWith("/messages") && unread > 0 && <span aria-label={`${unread} neprečítaných správ`} className="ml-2 rounded-full bg-emerald-700 px-2 py-0.5 text-xs text-white">{unread > 99 ? "99+" : unread}</span>}</Link>;
  })}</nav>;
}
