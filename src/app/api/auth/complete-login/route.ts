import { NextRequest, NextResponse } from "next/server";
import {
  verifyPrivyToken,
  extractBearerToken,
  getSupabaseAdmin,
} from "@/lib/auth/server";
import { PrivyTokenPayload } from "@/lib/auth/types";

/**
 * POST handler - Create or update user and track access code utilization
 */
export async function POST(request: NextRequest) {
  try {
    console.log("Complete login request received");
    // 1. Extract and verify Privy token
    const token = extractBearerToken(request);
    if (!token) {
      return NextResponse.json(
        { success: false, error: "No Authorization header or invalid format" },
        { status: 401 }
      );
    }

    const tokenPayload = await verifyPrivyToken(token);
    if (!tokenPayload) {
      console.warn(
        "Token verification failed, attempting alternative approach"
      );

      // Fallback mechanism if token verification fails
      try {
        // Try to get information from the request body instead
        const { privyUserData } = await request.json();
        if (!privyUserData || !privyUserData.id) {
          return NextResponse.json(
            { success: false, error: "Invalid authentication data" },
            { status: 401 }
          );
        }

        // Continue with the data from the request body
        console.log("Using fallback approach with provided user data");
      } catch (err) {
        console.error("Fallback authentication approach failed:", err);
        return NextResponse.json(
          { success: false, error: "Authentication failed" },
          { status: 401 }
        );
      }
    }

    // 2. Extract Privy user data from token and request body
    const privyDid = tokenPayload?.sub;
    const { privyUserData } = await request.json();

    console.log("Privy DID:", privyDid);
    console.log("Privy user data:", privyUserData);

    // Get admin Supabase client for secure operations
    const supabaseAdmin = getSupabaseAdmin();

    // 3. Extract access code from cookies if present
    const accessCode = request.cookies.get("access_code")?.value;
    console.log("Access code from cookie:", accessCode);

    // 4. Prepare user data - migrating the exact logic from the client side
    let walletAddress = privyUserData.wallet?.address;
    let smartWalletAddress: string | undefined = undefined;

    // If no wallet address is found, try to get it from the linked accounts
    if (!walletAddress && privyUserData.linkedAccounts) {
      const embeddedWallet = privyUserData.linkedAccounts.find(
        (account: any) =>
          account.type === "wallet" && account.walletClientType === "privy"
      );

      if (embeddedWallet) {
        walletAddress = embeddedWallet.address;
        console.log(
          "Found embedded wallet address from linkedAccounts:",
          walletAddress
        );
      }
    }

    // Get smart wallet address if available
    if (privyUserData.linkedAccounts) {
      const smartWalletAccount = privyUserData.linkedAccounts.find(
        (account: any) => account.type === "smart_wallet"
      );

      if (smartWalletAccount) {
        smartWalletAddress = smartWalletAccount.address;
        console.log(
          "Found smart wallet address from linkedAccounts:",
          smartWalletAddress
        );
      }
    }

    if (!walletAddress) {
      console.log("No wallet address available for user");
      return NextResponse.json(
        { success: false, error: "No wallet address found for user" },
        { status: 400 }
      );
    }

    // 5. Try to get existing user by wallet address
    const { data: existingUser, error: userError } = await supabaseAdmin
      .from("users")
      .select("*")
      .eq("wallet_address", walletAddress)
      .single();

    if (userError && userError.code !== "PGRST116") {
      console.error("Error fetching user:", userError);
      return NextResponse.json(
        { success: false, error: "Database error" },
        { status: 500 }
      );
    }

    let user;

    // 6. If user doesn't exist, create a new one
    if (!existingUser) {
      console.log("Creating new user...");
      const newUser = {
        wallet_address: walletAddress,
        smart_wallet_address: smartWalletAddress,
        privy_did: privyDid,
        name:
          privyUserData.twitter?.username ||
          privyUserData.name?.first ||
          privyUserData.email?.address?.split("@")[0] ||
          "Anonymous",
        email: privyUserData.email?.address,
        twitter_username: privyUserData.twitter?.username || undefined,
        avatar_url: privyUserData.avatar || undefined,
        username: privyUserData.twitter?.username
          ? privyUserData.twitter.username.toLowerCase()
          : undefined,
      };

      console.log("New user data:", newUser);

      const { data: createdUser, error: createError } = await supabaseAdmin
        .from("users")
        .upsert(newUser)
        .select()
        .single();

      if (createError) {
        console.error("Error creating user:", createError);
        return NextResponse.json(
          { success: false, error: "Failed to create user" },
          { status: 500 }
        );
      }

      // Initialize user_points record for the new user
      const userPointsData = {
        user_id: createdUser.id,
        funded_points: 0,
        raised_points: 0,
        onboarding_points: 0,
        checkin_points: 0,
      };

      const { error: pointsError } = await supabaseAdmin
        .from("user_points")
        .insert(userPointsData);

      if (pointsError) {
        console.error("Error initializing user_points:", pointsError);
        // We don't fail the entire request if points initialization fails
        // The awardPoints function can recover by creating the record when needed
      } else {
        console.log(
          `Successfully initialized user_points for user ${createdUser.id}`
        );
      }

      user = createdUser;
    } else {
      // 7. Check if we need to update the user with new Privy data
      const updatedFields: Record<string, any> = {};
      let needsUpdate = false;

      const privyName = privyUserData.name?.first;
      const privyEmail = privyUserData.email?.address;
      const privyTwitter = privyUserData.twitter?.username;
      const privyAvatar = privyUserData.avatar;

      // Add or update Privy DID if it's not set
      if (privyDid && privyDid !== existingUser.privy_did) {
        updatedFields.privy_did = privyDid;
        needsUpdate = true;
        console.log("Updating user with Privy DID:", privyDid);
      }

      // Update smart wallet address if it exists and has changed
      if (
        smartWalletAddress &&
        smartWalletAddress !== existingUser.smart_wallet_address
      ) {
        updatedFields.smart_wallet_address = smartWalletAddress;
        needsUpdate = true;
      }

      // Prioritize Twitter username for the name field
      if (privyTwitter && privyTwitter !== existingUser.name) {
        updatedFields.name = privyTwitter;
        needsUpdate = true;
      } else if (
        privyName &&
        privyName !== existingUser.name &&
        !privyTwitter
      ) {
        updatedFields.name = privyName;
        needsUpdate = true;
      }

      if (privyEmail && privyEmail !== existingUser.email) {
        updatedFields.email = privyEmail;
        needsUpdate = true;
      }

      if (privyTwitter && privyTwitter !== existingUser.twitter_username) {
        updatedFields.twitter_username = privyTwitter;
        needsUpdate = true;
      }

      // Set username to Twitter username if Twitter username is available and username is not set
      if (
        privyTwitter &&
        (!existingUser.username ||
          existingUser.username !== privyTwitter.toLowerCase())
      ) {
        updatedFields.username = privyTwitter.toLowerCase();
        needsUpdate = true;
      }

      if (privyAvatar && privyAvatar !== existingUser.avatar_url) {
        updatedFields.avatar_url = privyAvatar;
        needsUpdate = true;
      }

      if (needsUpdate) {
        console.log("Updating user with new Privy data:", updatedFields);
        const { data: updatedUser, error: updateError } = await supabaseAdmin
          .from("users")
          .update({
            ...updatedFields,
            wallet_address: walletAddress,
          })
          .eq("id", existingUser?.id as string)
          .select()
          .single();

        if (updateError) {
          console.error("Error updating user:", updateError);
          return NextResponse.json(
            { success: false, error: "Failed to update user" },
            { status: 500 }
          );
        }

        user = updatedUser;
      } else {
        user = existingUser;
      }
    }

    // 8. If access code exists, mark it as fully utilized by this user
    if (accessCode) {
      // Ensure code is in SF-XXXXXX format (in case it was stored differently)
      let formattedCode = accessCode.trim().toUpperCase();
      if (!formattedCode.startsWith("SF-")) {
        formattedCode = `SF-${formattedCode}`;
      }

      // First check if it's a valid code
      const { data: codeData, error: codeError } = await supabaseAdmin
        .from("access_codes")
        .select("*")
        .ilike("code", formattedCode)
        .single();

      interface AccessCode {
        id: string;
        code: string;
        usage_count: number;
        max_uses: number;
        is_active: boolean;
        fully_utilized: boolean;
        user_id?: string;
      }

      if (!codeError && codeData) {
        // Safely extract values from codeData with type checking
        const id = codeData.id as string;
        const usageCount = (codeData.usage_count as number) || 0;
        const maxUses = (codeData.max_uses as number) || 1;

        // Check if the code has already reached maximum usage
        if (usageCount >= maxUses) {
          console.warn(
            `Access code ${formattedCode} has reached maximum usage`
          );
          // Don't fail the request, but log it
        } else {
          // Update the access code to increment usage, link to user, and mark as fully utilized
          const { error: updateError } = await supabaseAdmin
            .from("access_codes")
            .update({
              usage_count: usageCount + 1,
              user_id: user.id,
              fully_utilized: true,
              // Also update is_active based on the NEW usage count vs max_uses
              is_active: usageCount + 1 < maxUses,
            })
            .eq("id", id);

          if (updateError) {
            console.error("Error updating access code:", updateError);
            // Don't fail the request if access code update fails
          } else {
            console.log(
              `Access code ${formattedCode} marked as utilized by user ${user.id}`
            );
          }
        }
      }
    }

    // 9. Return the user data
    return NextResponse.json({
      success: true,
      user,
      message: "User authenticated and updated successfully",
    });
  } catch (error) {
    console.error("Error in complete-login:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}
