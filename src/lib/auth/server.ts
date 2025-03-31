import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { jwtVerify, importJWK } from "jose";
import {
  PrivyTokenPayload,
  AuthContext,
  UserResolutionResult,
  AuthResult,
  ApiResponse,
} from "./types";

// Supabase admin client for backend operations
let supabaseAdmin: ReturnType<typeof createClient>;

/**
 * Get Supabase admin client for backend operations
 */
export function getSupabaseAdmin() {
  if (!supabaseAdmin) {
    supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    );
  }
  return supabaseAdmin;
}

/**
 * Extract bearer token from an HTTP request
 */
export function extractBearerToken(request: NextRequest): string | null {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }
  return authHeader.replace("Bearer ", "");
}

/**
 * Verify a Privy token
 */
export async function verifyPrivyToken(
  token: string
): Promise<PrivyTokenPayload | null> {
  try {
    // Get the token audience (app ID) directly from the token
    const tokenAppId = extractAudienceFromToken(token);
    if (tokenAppId) {
      // Use the exact JWKS URL format from the docs with the app ID from the token
      const jwksUrl = `https://auth.privy.io/api/v1/apps/${tokenAppId}/jwks.json`;

      // Fetch the JWKS from Privy
      const jwksResponse = await fetch(jwksUrl);

      if (!jwksResponse.ok) {
        console.error(
          `Failed to fetch JWKS: ${jwksResponse.status} ${jwksResponse.statusText}`
        );
        return null;
      }

      const jwks = await jwksResponse.json();

      // Find the key that matches the token (ES256 is Privy's algorithm)
      const jsonWebKey = jwks.keys?.find((key: any) => key.alg === "ES256");
      if (!jsonWebKey) {
        console.error("No matching JWK found with alg=ES256");
        return null;
      }

      // According to our token, the issuer is simply "privy.io"
      const issuer = "privy.io";

      try {
        // Import the JWK as a proper CryptoKey
        const cryptoKey = await importJWK(jsonWebKey);

        const { payload } = await jwtVerify(token, cryptoKey, {
          issuer,
          audience: tokenAppId,
        });

        return payload as PrivyTokenPayload;
      } catch (error) {
        console.error("JWT verification failed:", error);
        console.log("Verification parameters:", {
          kid: jsonWebKey.kid,
          alg: jsonWebKey.alg,
          issuer,
          audience: tokenAppId,
        });
        return null;
      }
    } else {
      console.error("Could not extract audience from token");
      return null;
    }
  } catch (error) {
    console.error("Token verification process failed:", error);
    return null;
  }
}

/**
 * Extract audience (app ID) from a JWT token
 */
function extractAudienceFromToken(token: string): string | null {
  try {
    // JWT tokens are base64 encoded in 3 parts: header.payload.signature
    const parts = token.split(".");
    if (parts.length !== 3) return null;

    // Decode the payload part (middle section)
    const decodedPayload = Buffer.from(parts[1], "base64").toString();
    const payload = JSON.parse(decodedPayload);

    // Check for app ID in the audience field
    return payload.aud || null;
  } catch (e) {
    console.error("Error extracting audience from token:", e);
    return null;
  }
}

/**
 * Resolve a user from Privy DID
 */
export async function resolveUserFromPrivyDid(
  privyDid: string
): Promise<UserResolutionResult> {
  const supabase = getSupabaseAdmin();

  try {
    // Look up the user by Privy DID
    const { data: userByDid, error: didError } = await supabase
      .from("users")
      .select("id, name, privy_did")
      .eq("privy_did", privyDid)
      .maybeSingle();

    if (userByDid && userByDid.id) {
      return { success: true, userId: String(userByDid.id) };
    }

    // No user found with the provided Privy DID
    return {
      success: false,
      error: "No user associated with this Privy DID",
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    console.error("Error resolving user:", errorMessage);
    return { success: false, error: errorMessage };
  }
}

/**
 * Authenticate a request using Privy token
 */
export async function authenticateRequest(
  request: NextRequest
): Promise<AuthResult> {
  // Extract token
  const token = extractBearerToken(request);
  if (!token) {
    return {
      authenticated: false,
      error: "No Authorization header or invalid format",
      statusCode: 401,
    };
  }

  // Verify token
  const tokenPayload = await verifyPrivyToken(token);
  if (!tokenPayload) {
    return {
      authenticated: false,
      error: "Invalid or expired token",
      statusCode: 401,
    };
  }

  // Get Privy DID from token
  const privyDid = tokenPayload.sub;

  // Resolve user
  const userResult = await resolveUserFromPrivyDid(privyDid);
  if (!userResult.success) {
    return {
      authenticated: false,
      error: userResult.error || "User not found",
      statusCode: 401,
    };
  }

  // Successfully authenticated
  return {
    authenticated: true,
    userId: userResult.userId,
    privyDid: privyDid,
    data: {
      tokenPayload,
    },
  };
}

/**
 * Create an authenticated handler for API routes
 */
export function withAuth<T = any>(
  handler: (
    req: NextRequest,
    context: AuthContext,
    params?: any
  ) => Promise<ApiResponse>
) {
  return async (
    request: NextRequest,
    otherParams?: any
  ): Promise<ApiResponse> => {
    const authResult = await authenticateRequest(request);

    if (!authResult.authenticated) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.statusCode || 401 }
      );
    }

    // Create auth context for the handler
    const authContext: AuthContext = {
      userId: authResult.userId!,
      privyDid: authResult.privyDid!,
      tokenPayload: authResult.data?.tokenPayload as PrivyTokenPayload,
    };

    // Call the handler with auth context and other params if provided
    return handler(request, authContext, otherParams);
  };
}
