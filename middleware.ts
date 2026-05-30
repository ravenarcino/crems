// Middleware is deprecated in Next.js 16, but if you want to keep it,
// we'll keep it simple since we already have server-side protection
// in all admin pages and API routes

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  // We'll rely on server-side checks in pages and API routes
  // for authentication and authorization
  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
