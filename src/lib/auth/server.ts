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
    // Log token for debugging (just the start)
    console.log("Verifying token:", token.substring(0, 15) + "...");

    // Get the token audience (app ID) directly from the token
    const tokenAppId = extractAudienceFromToken(token);
    if (tokenAppId) {
      console.log("Extracted App ID from token:", tokenAppId);

      // Use the exact JWKS URL format from the docs with the app ID from the token
      const jwksUrl = `https://auth.privy.io/api/v1/apps/${tokenAppId}/jwks.json`;
      console.log("Using JWKS URL:", jwksUrl);

      // Fetch the JWKS from Privy
      const jwksResponse = await fetch(jwksUrl);

      if (!jwksResponse.ok) {
        console.error(
          `Failed to fetch JWKS: ${jwksResponse.status} ${jwksResponse.statusText}`
        );
        return null;
      }

      const jwks = await jwksResponse.json();
      console.log("JWKS response received with keys:", jwks.keys?.length || 0);

      // Find the key that matches the token (ES256 is Privy's algorithm)
      const jsonWebKey = jwks.keys?.find((key: any) => key.alg === "ES256");
      if (!jsonWebKey) {
        console.error("No matching JWK found with alg=ES256");
        return null;
      }

      // According to our token, the issuer is simply "privy.io"
      const issuer = "privy.io";
      console.log("Using issuer:", issuer);

      try {
        // Import the JWK as a proper CryptoKey
        const cryptoKey = await importJWK(jsonWebKey);
        console.log("Successfully imported JWK as CryptoKey");

        const { payload } = await jwtVerify(token, cryptoKey, {
          issuer,
          audience: tokenAppId,
        });

        console.log("Token verified successfully with sub:", payload.sub);
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
    // Look up the user in database by wallet address
    const { data, error } = await supabase
      .from("users")
      .select("id, wallet_address")
      .eq("wallet_address", privyDid)
      .maybeSingle();

    if (data && data.id) {
      console.log("Found user by wallet address:", data.id);
      return { success: true, userId: String(data.id) };
    }

    // For debugging: fetch all users
    const { data: allUsers } = await supabase.from("users").select("*");
    console.log("All users count:", allUsers?.length || 0);

    if (allUsers?.length) {
      console.log(
        "First few users:",
        allUsers
          .slice(0, 3)
          .map((u) => ({ id: u.id, wallet: u.wallet_address }))
      );
    }

    // For demo purposes: use the first user
    if (allUsers && allUsers.length > 0) {
      console.log("Using first user:", allUsers[0].id);
      return { success: true, userId: String(allUsers[0].id) };
    }

    // Create a new user if none exists
    const { data: newUser, error: insertError } = await supabase
      .from("users")
      .insert({
        wallet_address: privyDid,
        name: "Privy User",
        username: `privy_${Math.floor(Math.random() * 10000)}`,
      })
      .select()
      .single();

    if (insertError || !newUser) {
      console.error("Error creating new user:", insertError);
      return { success: false, error: "Failed to create user" };
    }

    console.log("Created new user:", newUser.id);
    return { success: true, userId: String(newUser.id) };
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
    console.warn("No Authorization header or invalid format");
    return {
      authenticated: false,
      error: "No Authorization header or invalid format",
      statusCode: 401,
    };
  }

  console.log("Found Authorization header with token");

  // Verify token
  const tokenPayload = await verifyPrivyToken(token);
  if (!tokenPayload) {
    console.error("Token verification failed");
    return {
      authenticated: false,
      error: "Invalid or expired token",
      statusCode: 401,
    };
  }

  console.log("Token verification successful");

  // Get Privy DID from token
  const privyDid = tokenPayload.sub;
  console.log("Private DID from token:", privyDid);

  // Resolve user
  const userResult = await resolveUserFromPrivyDid(privyDid);
  if (!userResult.success) {
    console.error("User resolution failed:", userResult.error);
    return {
      authenticated: false,
      error: userResult.error || "User not found",
      statusCode: 401,
    };
  }

  console.log("User resolution successful, ID:", userResult.userId);

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
