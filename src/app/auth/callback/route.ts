import { NextResponse, type NextRequest } from "next/server";
import { dashboardPathForRole } from "@/lib/auth";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const requestedNext = requestUrl.searchParams.get("next");
  const next = requestedNext && (requestedNext === "/reset-password" || /^\/(customer|master|admin)(\/|$)/.test(requestedNext)) && !requestedNext.includes("\\") ? requestedNext : null;

  if (code) {
    const supabase = await createServerSupabaseClient();
    await supabase.auth.exchangeCodeForSession(code);
    const {
      data: { user }
    } = await supabase.auth.getUser();

    if (user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      return NextResponse.redirect(
        new URL(next ?? dashboardPathForRole(profile?.role ?? "customer"), request.url)
      );
    }
  }

  return NextResponse.redirect(new URL("/login", request.url));
}
