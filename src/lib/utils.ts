import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number | null | undefined) {
  if (typeof amount !== "number") {
    return "-";
  }

  return new Intl.NumberFormat("sk-SK", {
    style: "currency",
    currency: "EUR"
  }).format(amount / 100);
}

export function formatDateTime(value: string | null | undefined) {
  if (!value) {
    return "-";
  }

  return new Intl.DateTimeFormat("sk-SK", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

export function buildOrderNumber() {
  const date = new Date().toISOString().slice(0, 10).replaceAll("-", "");
  const random = Math.random().toString(36).slice(2, 8).toUpperCase();

  return `FL-${date}-${random}`;
}
