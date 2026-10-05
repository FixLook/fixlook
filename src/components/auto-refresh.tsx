"use client";
import { useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
export function AutoRefresh() {
  const router = useRouter();
  const [, startTransition] = useTransition();
  useEffect(() => {
    const id = setInterval(() => { if (document.visibilityState === "visible") startTransition(() => router.refresh()); }, 15000);
    return () => clearInterval(id);
  }, [router]);
  return null;
}
