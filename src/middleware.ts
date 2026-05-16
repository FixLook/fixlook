import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

const protectedPrefixes = ["/customer", "/master", "/admin"];

export async function middleware(request: NextRequest) {
  const sessionResponse = await updateSession(request);
  const isProtected = protectedPrefixes.some((prefix) =>
    request.nextUrl.pathname.startsWith(prefix)
  );

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
