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
    console.log("No valid Authorization header found in request");
    return response;
  }

  try {
    // Verify the token
    const payload = await verifyPrivyToken(token);

    if (!payload) {
      console.log("Invalid Privy token");
      return response;
    }

    console.log("Valid Privy token found", {
      subject: payload.sub,
      issuer: payload.iss,
      audience: payload.aud,
    });

    // For demo purposes, we're not setting anything on the response
    // since we're using direct token verification in the API endpoints

    return response;
  } catch (error) {
    console.error("Error verifying Privy token:", error);
    return response;
  }
}

export const config = {
  matcher: ["/api/test/:path*"],
};
