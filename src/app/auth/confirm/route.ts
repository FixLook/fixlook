import { NextResponse, type NextRequest } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { dashboardPathForRole } from "@/lib/auth";
export async function GET(request: NextRequest) {
  const tokenHash = request.nextUrl.searchParams.get("token_hash");
  const type = request.nextUrl.searchParams.get("type");
  if (tokenHash && (type === "signup" || type === "email" || type === "recovery")) {
    const db = await createServerSupabaseClient();
    const { data, error } = await db.auth.verifyOtp({ token_hash: tokenHash, type });
    if (!error && data.user) {
      const { data: profile } = await db.from("profiles").select("role").eq("id", data.user.id).single();
      return NextResponse.redirect(new URL(type === "recovery" ? "/reset-password" : dashboardPathForRole(profile?.role ?? "customer"), request.url));
    }
  }
  return NextResponse.redirect(new URL("/login?error=" + encodeURIComponent("Potvrdzovací odkaz nie je platný alebo už vypršal. Požiadajte o nový."), request.url));
}
