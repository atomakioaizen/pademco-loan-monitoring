import { NextResponse } from "next/server";

// Edge-compatible base64url JSON parser
function parseTokenPayload(token) {
  try {
    if (!token) return null;
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = atob(base64);
    const payload = JSON.parse(jsonPayload);
    if (payload.exp < Date.now()) return null; // Expired
    return payload;
  } catch (e) {
    return null;
  }
}

export function proxy(request) {
  const { pathname } = request.nextUrl;

  // Public files, static folders, api/auth paths, PWA manifest, service worker
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api/auth") ||
    pathname === "/favicon.ico" ||
    pathname === "/manifest.json" ||
    pathname === "/sw.js"
  ) {
    return NextResponse.next();
  }

  const sessionCookie = request.cookies.get("pademco_session")?.value;
  const user = parseTokenPayload(sessionCookie);

  // If not logged in and not on login or register pages, redirect to login
  if (!user && pathname !== "/login" && pathname !== "/register") {
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  // If logged in and on login page, redirect to home
  if (user && pathname === "/login") {
    const homeUrl = new URL("/", request.url);
    return NextResponse.redirect(homeUrl);
  }

  // Role-based authorization checks
  if (user) {
    // 1. Settings & User Management: ADMIN full access, BOOKKEEPER limited
    if (
      (pathname.startsWith("/settings") || pathname.startsWith("/users")) &&
      user.role !== "ADMIN" && user.role !== "BOOKKEEPER"
    ) {
      const homeUrl = new URL("/", request.url);
      return NextResponse.redirect(homeUrl);
    }

    // 2. Reports: ADMIN, BOOKKEEPER, CASHIER, and AGENT access
    if (pathname.startsWith("/reports") && !["ADMIN", "BOOKKEEPER", "CASHIER", "AGENT"].includes(user.role)) {
      const homeUrl = new URL("/", request.url);
      return NextResponse.redirect(homeUrl);
    }

    // 3. Staff-only routes
    const staffOnlyRoutes = ["/payments", "/bookings", "/offices", "/airlines", "/employees", "/audit", "/bookkeeper", "/commissions"];
    if (
      staffOnlyRoutes.some((route) => pathname.startsWith(route)) &&
      user.role === "VIEWER"
    ) {
      if (pathname.startsWith("/payments/receipt/")) {
        return NextResponse.next();
      }
      const homeUrl = new URL("/", request.url);
      return NextResponse.redirect(homeUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!api/auth|_next/|static/|manifest.json|sw.js|[\\w-]+\\.\\w+).*)",
  ],
};
