import { NextResponse } from "next/server";

// Simple Edge-compatible base64url JSON parser
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

export function middleware(request) {
  const { pathname } = request.nextUrl;
  
  // Public files, static folders, api/auth paths
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api/auth") ||
    pathname === "/favicon.ico"
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
    // 1. Settings & User Management require ADMIN
    if (
      (pathname.startsWith("/settings") || pathname.startsWith("/users")) &&
      user.role !== "ADMIN"
    ) {
      const homeUrl = new URL("/", request.url);
      return NextResponse.redirect(homeUrl);
    }

    // 2. Payments, Reports, Bookings, Offices, Airlines, Audit, and Employees require ADMIN or CASHIER
    const adminOrCashierRoutes = ["/payments", "/reports", "/bookings", "/offices", "/airlines", "/employees", "/audit"];
    if (
      adminOrCashierRoutes.some((route) => pathname.startsWith(route)) &&
      user.role === "VIEWER"
    ) {
      // Exclude receipt page from blocking for VIEWER so they can print their own receipts
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
    /*
     * Match all request paths except for the ones starting with:
     * - api/auth (auth APIs)
     * - _next (Next.js static assets & prefetch chunks)
     * - static (public static assets)
     * - favicon.ico, logo files, etc.
     */
    "/((?!api/auth|_next/|static/|[\\w-]+\\.\\w+).*)",
  ],
};
