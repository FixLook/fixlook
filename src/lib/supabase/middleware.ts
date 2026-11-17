import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";
import type { Database } from "@/lib/database.types";

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({
    request
  });

  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ) {
    return response;
  }

  const supabase = createServerClient<Database, "public">(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({
            request
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        }
      }
    }
  );

  // Anonymous requests have no session to refresh. Avoid a network round-trip,
  // especially on the landing page when Supabase is temporarily unavailable.
  const hasAuthCookie = request.cookies.getAll().some(({ name }) =>
    name.startsWith("sb-") && name.includes("auth-token") ||
    name === "sb-access-token"
  );
  if (!hasAuthCookie) return response;

  // getUser still verifies the session server-side. Caller decides how to
  // handle network failures without treating them as a valid login.
  await supabase.auth.getUser();

  return response;
}
