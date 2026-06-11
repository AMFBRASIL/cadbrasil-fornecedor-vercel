import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { applyCorsHeaders, isAllowedOrigin } from "@/lib/http/cors";

export function middleware(request: NextRequest) {
  const origin = request.headers.get("origin");

  if (request.method === "OPTIONS" && request.nextUrl.pathname.startsWith("/api/")) {
    const response = new NextResponse(null, { status: 204 });
    if (isAllowedOrigin(origin)) {
      applyCorsHeaders(response.headers, origin);
      response.headers.set("Access-Control-Max-Age", "86400");
    }
    return response;
  }

  const response = NextResponse.next();

  if (request.nextUrl.pathname.startsWith("/api/")) {
    applyCorsHeaders(response.headers, origin);
  }

  return response;
}

export const config = {
  matcher: "/api/:path*",
};
