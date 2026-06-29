import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export default auth((req) => {
  const { nextUrl, auth: session } = req as NextRequest & { auth: { user: { role: string; active: boolean } } | null };

  const isLoggedIn = !!session?.user;
  const isActive = session?.user?.active !== false;
  const role = session?.user?.role;
  const pathname = nextUrl.pathname;

  if (pathname.startsWith("/dashboard")) {
    if (!isLoggedIn || !isActive) {
      return NextResponse.redirect(new URL("/login", req.url));
    }

    if (role === "VIEWER" && pathname.startsWith("/dashboard/settings")) {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }
    if (role === "PICKER_PACKER" && (pathname.startsWith("/dashboard/analytics") || pathname.startsWith("/dashboard/settings"))) {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }
    if (role === "MANAGER" && pathname.startsWith("/dashboard/settings/users")) {
      return NextResponse.redirect(new URL("/dashboard/settings", req.url));
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/dashboard/:path*"],
};
