import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifyPrivyToken, extractBearerToken } from "./lib/auth/server";

export async function middleware(request: NextRequest) {
  // Skip middleware for the public test API endpoint
  if (request.nextUrl.pathname === "/api/test/debug") {
    return NextResponse.next();
  }

  // Get the Privy JWT from the Authorization header or cookie
  let token = extractBearerToken(request);
  if (!token) {
    // Try to get from cookie (Privy HTTP-only cookie setup)
    token = request.cookies.get("privy-token")?.value || null;
  }

  // Optionally, you could verify the token here if you want to set headers or context
  // But for routing, just let the request proceed

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next|api/auth).*)"],
};
