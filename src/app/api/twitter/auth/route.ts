import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/auth/server";
import crypto from "crypto";

// Twitter OAuth configuration
const TWITTER_CLIENT_ID = process.env.TWITTER_CLIENT_ID;
const TWITTER_CLIENT_SECRET = process.env.TWITTER_CLIENT_SECRET;
const TWITTER_CALLBACK_URL = `${process.env.NEXT_PUBLIC_APP_URL}/api/twitter/callback`;

export async function POST(request: NextRequest) {
  try {
    // Authenticate the request
    const authResult = await authenticateRequest(request);

    if (!authResult.authenticated) {
      return NextResponse.json(
        { error: authResult.error || "Unauthorized" },
        { status: authResult.statusCode || 401 }
      );
    }

    // Generate state parameter for CSRF protection
    const state = crypto.randomBytes(32).toString("hex");

    // Store state in session/cookie for verification
    // TODO: Implement proper state storage

    // Construct Twitter OAuth URL
    const params = new URLSearchParams({
      response_type: "code",
      client_id: TWITTER_CLIENT_ID!,
      redirect_uri: TWITTER_CALLBACK_URL,
      state,
      scope: "tweet.read users.read offline.access",
    });

    const authUrl = `https://twitter.com/i/oauth2/authorize?${params.toString()}`;

    return NextResponse.json({ authUrl });
  } catch (error) {
    console.error("Error initiating Twitter auth:", error);
    return NextResponse.json(
      { error: "Failed to initiate Twitter authentication" },
      { status: 500 }
    );
  }
}
