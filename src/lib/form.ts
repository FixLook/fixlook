import { redirect } from "next/navigation";

export function getString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

export function redirectWithError(path: string, message: string): never {
  redirect(`${path}?error=${encodeURIComponent(message)}`);
}

export function redirectWithMessage(path: string, message: string): never {
  redirect(`${path}?message=${encodeURIComponent(message)}`);
}

export function euroToCents(value: number) {
  return Math.round(value * 100);
}
