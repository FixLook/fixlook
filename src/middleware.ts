import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

const protectedPrefixes = ["/customer", "/master", "/admin"];

export async function middleware(request: NextRequest) {
  const isProtected = protectedPrefixes.some((prefix) =>
    request.nextUrl.pathname === prefix || request.nextUrl.pathname.startsWith(`${prefix}/`)
  );
  let sessionResponse: NextResponse;
  try {
    sessionResponse = await updateSession(request);
  } catch (error) {
    // A Supabase outage must not take down public pages, and must never
    // silently authenticate a user for protected pages.
    console.error("Supabase session refresh unavailable", {
      path: request.nextUrl.pathname,
      errorType: error instanceof Error ? error.name : "UnknownError"
    });
    return isProtected
      ? new NextResponse("Overenie prihlásenia je dočasne nedostupné. Skúste to znova.", {
          status: 503,
          headers: { "Cache-Control": "no-store" }
        })
      : NextResponse.next();
  }

  if (!isProtected) {
    return sessionResponse;
  }

  const hasSession =
    request.cookies.has("sb-access-token") ||
    request.cookies
      .getAll()
      .some((cookie) => cookie.name.includes("auth-token"));

  if (!hasSession) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.searchParams.set("next", request.nextUrl.pathname);

    return NextResponse.redirect(loginUrl);
  }

  return sessionResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"
  ]
};
