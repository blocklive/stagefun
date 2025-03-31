import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifyPrivyToken, extractBearerToken } from "./lib/auth/server";

export async function middleware(request: NextRequest) {
  // Skip middleware for the public test API endpoint
  if (request.nextUrl.pathname === "/api/test/debug") {
    return NextResponse.next();
  }

  // Get the response to modify
  const response = NextResponse.next();

  // Get the Privy JWT from the Authorization header
  const token = extractBearerToken(request);

  if (!token) {
    return response;
  }

  try {
    // Verify the token
    const payload = await verifyPrivyToken(token);

    if (!payload) {
      return response;
    }

    // For demo purposes, we're not setting anything on the response
    // since we're using direct token verification in the API endpoints

    return response;
  } catch (error) {
    return response;
  }
}

export const config = {
  matcher: ["/api/test/:path*"],
};
