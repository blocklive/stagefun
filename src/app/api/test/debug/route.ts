import { NextRequest, NextResponse } from "next/server";
import {
  withAuth,
  getSupabaseAdmin,
  verifyPrivyToken,
  extractBearerToken,
} from "@/lib/auth/server";
import { AuthContext, PrivyTokenPayload } from "@/lib/auth/types";

// Helper function to extract and parse the token
function parseToken(token: string) {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) {
      return { error: "Invalid token format" };
    }

    const header = JSON.parse(Buffer.from(parts[0], "base64").toString());
    const payload = JSON.parse(Buffer.from(parts[1], "base64").toString());

    return {
      header,
      payload: {
        ...payload,
        exp: payload.exp
          ? new Date(payload.exp * 1000).toISOString()
          : undefined,
        iat: payload.iat
          ? new Date(payload.iat * 1000).toISOString()
          : undefined,
      },
    };
  } catch (error) {
    return {
      error: `Error parsing token: ${
        error instanceof Error ? error.message : String(error)
      }`,
    };
  }
}

/**
 * GET handler - Debug Privy token
 */
export const GET = withAuth(async (request: NextRequest, auth: AuthContext) => {
  try {
    // Get auth header and token
    const authHeader = request.headers.get("authorization");
    const token = extractBearerToken(request);

    // Check if this is a direct token test
    const rawToken = request.nextUrl.searchParams.get("token");
    if (rawToken) {
      console.log("Testing raw token directly");

      // Parse token directly
      const parsedToken = parseToken(rawToken);

      // Verify the token
      try {
        const payload = await verifyPrivyToken(rawToken);

        if (payload) {
          return NextResponse.json({
            directTokenTest: true,
            tokenValid: true,
            tokenParsed: parsedToken,
            tokenVerified: {
              sub: payload.sub,
              iss: payload.iss,
              aud: payload.aud,
              exp: payload.exp
                ? new Date(payload.exp * 1000).toISOString()
                : undefined,
              iat: payload.iat
                ? new Date(payload.iat * 1000).toISOString()
                : undefined,
            },
          });
        } else {
          return NextResponse.json({
            directTokenTest: true,
            tokenValid: false,
            tokenParsed: parsedToken,
            error: "Token verification failed",
          });
        }
      } catch (error) {
        return NextResponse.json({
          directTokenTest: true,
          tokenValid: false,
          tokenParsed: parsedToken,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    // Get supabase admin client
    const supabaseAdmin = getSupabaseAdmin();

    // Get list of users for debugging
    const { data: users, error: usersError } = await supabaseAdmin
      .from("users")
      .select("*");

    if (usersError) {
      console.error("Error fetching users:", usersError);
    }

    // Parse the authentication token
    const parsedToken = token ? parseToken(token) : null;

    // Return debug information
    return NextResponse.json({
      authHeader: authHeader
        ? {
            format: authHeader.startsWith("Bearer ") ? "valid" : "invalid",
            value: authHeader.substring(0, 15) + "...",
          }
        : null,
      tokenInfo: {
        subject: auth.tokenPayload.sub,
        issuer: auth.tokenPayload.iss,
        audience: auth.tokenPayload.aud,
        expiresAt: auth.tokenPayload.exp
          ? new Date(auth.tokenPayload.exp * 1000).toISOString()
          : undefined,
        issuedAt: auth.tokenPayload.iat
          ? new Date(auth.tokenPayload.iat * 1000).toISOString()
          : undefined,
        sessionId: auth.tokenPayload.sid,
      },
      userId: auth.userId,
      privyDid: auth.privyDid,
      parsedToken,
      usersInDatabase: users
        ? users.map((u) => ({ id: u.id, wallet: u.wallet_address }))
        : [],
      authHeaderPresent: !!authHeader,
      tokenPresent: !!token,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error in debug route:", error);
    return NextResponse.json(
      {
        error: "Failed to process request",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
});
