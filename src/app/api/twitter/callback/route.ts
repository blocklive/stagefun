import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/auth/server";

// Twitter OAuth configuration
const TWITTER_CLIENT_ID = process.env.TWITTER_CLIENT_ID;
const TWITTER_CLIENT_SECRET = process.env.TWITTER_CLIENT_SECRET;
const TWITTER_CALLBACK_URL = `${process.env.NEXT_PUBLIC_APP_URL}/api/twitter/callback`;

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get("code");
    const state = searchParams.get("state");
    const error = searchParams.get("error");

    if (error) {
      throw new Error(`Twitter OAuth error: ${error}`);
    }

    if (!code || !state) {
      throw new Error("Missing required OAuth parameters");
    }

    // TODO: Verify state parameter matches stored state

    // Exchange code for access token
    const tokenResponse = await fetch(
      "https://api.twitter.com/2/oauth2/token",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Authorization: `Basic ${Buffer.from(
            `${TWITTER_CLIENT_ID}:${TWITTER_CLIENT_SECRET}`
          ).toString("base64")}`,
        },
        body: new URLSearchParams({
          code,
          grant_type: "authorization_code",
          redirect_uri: TWITTER_CALLBACK_URL,
        }),
      }
    );

    const tokenData = await tokenResponse.json();

    if (!tokenResponse.ok) {
      throw new Error(
        `Failed to get access token: ${tokenData.error_description}`
      );
    }

    // Get user info from Twitter
    const userResponse = await fetch(
      "https://api.twitter.com/2/users/me?user.fields=username",
      {
        headers: {
          Authorization: `Bearer ${tokenData.access_token}`,
        },
      }
    );

    const userData = await userResponse.json();

    if (!userResponse.ok) {
      throw new Error("Failed to get user info from Twitter");
    }

    // Get the current user's ID from the session
    const {
      data: { user },
    } = await getSupabaseAdmin().auth.getUser();

    if (!user) {
      throw new Error("No authenticated user found");
    }

    // Update user's Twitter username in our database
    const { error: updateError } = await getSupabaseAdmin()
      .from("users")
      .update({
        twitter_username: userData.data.username,
        twitter_access_token: tokenData.access_token,
        twitter_refresh_token: tokenData.refresh_token,
        twitter_token_expires_at: new Date(
          Date.now() + tokenData.expires_in * 1000
        ).toISOString(),
      })
      .eq("id", user.id);

    if (updateError) {
      throw new Error("Failed to update user's Twitter info");
    }

    // Redirect back to onboarding page
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/onboarding`
    );
  } catch (error) {
    console.error("Error in Twitter callback:", error);
    // Redirect to onboarding page with error
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/onboarding?error=twitter_auth_failed`
    );
  }
}
