import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest, getSupabaseAdmin } from "@/lib/auth/server";
import { awardPoints, PointType } from "@/lib/services/points.service";
import { ethers } from "ethers";
import { CONTRACT_ADDRESSES } from "@/lib/contracts/addresses";
import { NETWORK } from "@/lib/contracts/addresses";

// Map of mission IDs to token addresses to verify
const MISSION_TOKEN_MAP: Record<string, string> = {
  swap_mon_usdc: CONTRACT_ADDRESSES.monadTestnet.usdc,
  swap_shmon: CONTRACT_ADDRESSES.monadTestnet.shmon,
  swap_aprmon: CONTRACT_ADDRESSES.monadTestnet.aprmon,
  swap_gmon: CONTRACT_ADDRESSES.monadTestnet.gmon,
};

// Mission points (matching what's in award-mission route)
const MISSION_POINTS: Record<string, number> = {
  swap_mon_usdc: 1000,
  swap_shmon: 1000,
  swap_aprmon: 1000,
  swap_gmon: 1000,
  add_liquidity: 2000,
};

export async function POST(request: NextRequest) {
  try {
    // Debug authentication
    const token = request.headers.get("Authorization");
    console.log("[verify-swap] Auth header exists:", !!token);
    console.log(
      "[verify-swap] Auth header starts with Bearer:",
      token?.startsWith("Bearer ")
    );

    // Authenticate the request using Privy JWT
    console.log("[verify-swap] Starting authentication process...");
    const authResult = await authenticateRequest(request);
    console.log("[verify-swap] Auth result:", {
      authenticated: authResult.authenticated,
      userId: authResult.userId,
      error: authResult.error,
      statusCode: authResult.statusCode,
    });

    if (!authResult.authenticated) {
      console.log("[verify-swap] Authentication failed:", authResult.error);
      return NextResponse.json(
        { error: authResult.error || "Unauthorized" },
        { status: authResult.statusCode || 401 }
      );
    }

    const userId = authResult.userId as string;

    // Ensure userId is defined
    if (!userId) {
      console.log("[verify-swap] No userId in auth result");
      return NextResponse.json(
        { error: "User ID not found in authentication" },
        { status: 400 }
      );
    }

    console.log("[verify-swap] Successfully authenticated user:", userId);

    // Create an admin client with service role permissions
    console.log("[verify-swap] Creating admin client...");
    const adminClient = getSupabaseAdmin();

    // Parse request body
    const body = await request.json();
    const { missionId, txHash, walletAddress } = body;
    console.log("[verify-swap] Request body:", {
      missionId,
      txHash,
      walletAddress: !!walletAddress,
    });

    if (!missionId || !txHash) {
      console.log("[verify-swap] Missing required params");
      return NextResponse.json(
        {
          error: "Bad Request",
          message: "Mission ID and transaction hash are required",
        },
        { status: 400 }
      );
    }

    // Get point value for the mission
    const pointsValue = MISSION_POINTS[missionId] || 0;
    if (pointsValue === 0) {
      return NextResponse.json(
        {
          error: "Bad Request",
          message:
            "Invalid mission ID or no points associated with this mission",
        },
        { status: 400 }
      );
    }

    // Check if the mission is already completed
    const { data: existingMission, error: checkError } = await adminClient
      .from("user_completed_missions")
      .select("id, points_awarded")
      .eq("user_id", userId)
      .eq("mission_id", missionId)
      .maybeSingle();

    if (checkError) {
      console.error("Error checking mission completion:", checkError);
      return NextResponse.json(
        { error: "Database Error", message: "Failed to check mission status" },
        { status: 500 }
      );
    }

    // If mission already completed and points awarded
    if (existingMission?.points_awarded) {
      return NextResponse.json(
        {
          success: true,
          message: "Points already awarded for this mission",
          alreadyCompleted: true,
        },
        { status: 200 }
      );
    }

    // Get the user's smart wallet address from the database
    console.log("[verify-swap] Fetching user wallet address...");
    const { data: userData, error: userError } = await adminClient
      .from("users")
      .select("wallet_address, smart_wallet_address")
      .eq("id", userId)
      .single();

    if (userError) {
      console.error(
        "[verify-swap] Error fetching user wallet address:",
        userError
      );
      return NextResponse.json(
        { error: "Database Error", message: "Failed to fetch user data" },
        { status: 500 }
      );
    }

    // Store the smart wallet address for validation
    const userWalletAddress =
      userData.smart_wallet_address || userData.wallet_address;

    console.log("[verify-swap] User wallet data:", {
      hasSmartWallet: !!userData.smart_wallet_address,
      hasWallet: !!userData.wallet_address,
      finalWallet: userWalletAddress,
    });

    if (!userWalletAddress) {
      console.log("[verify-swap] No wallet address found for user");
      return NextResponse.json(
        { error: "Bad Request", message: "User doesn't have a wallet address" },
        { status: 400 }
      );
    }

    // Ensure wallet address is always treated as a string
    const userWalletAddressStr = String(userWalletAddress).toLowerCase();
    console.log(
      "[verify-swap] User wallet address (normalized):",
      userWalletAddressStr
    );

    // Initialize a provider to fetch transaction details
    const provider = new ethers.JsonRpcProvider(NETWORK.rpcUrl);
    console.log("[verify-swap] Created provider for network:", NETWORK.chainId);

    // Verify the transaction
    try {
      // Get transaction details
      console.log("[verify-swap] Fetching transaction:", txHash);
      const tx = await provider.getTransaction(txHash);

      if (!tx) {
        console.log("[verify-swap] Transaction not found:", txHash);
        return NextResponse.json(
          { error: "Bad Request", message: "Transaction not found" },
          { status: 400 }
        );
      }

      console.log("[verify-swap] Transaction found:", {
        from: tx.from,
        to: tx.to,
        blockNumber: tx.blockNumber,
      });

      // Modified verification for smart contract wallets
      // Instead of just checking tx.from, we'll check if the wallet address appears
      // in any of the internal transactions/token transfers
      console.log("[verify-swap] User wallet:", userWalletAddressStr);
      console.log("[verify-swap] Transaction sender:", tx.from.toLowerCase());

      // For account abstraction/smart contract wallets, the main tx.from might be a proxy contract
      // We need to check if user wallet is involved in the transaction in any way
      // Since we can't fully decode internal transactions here, we'll look for specific patterns

      // Option 1: Direct matching of main tx.from
      const isMainSender = tx.from.toLowerCase() === userWalletAddressStr;

      // Option 2: Look for user wallet pattern in the transaction data
      // This checks if the user wallet address appears in the transaction input data
      // Convert to lowercase and remove 0x prefix for consistent matching
      const walletNoPrefix = userWalletAddressStr
        .replace("0x", "")
        .toLowerCase();
      const txDataStr = tx.data ? tx.data.toLowerCase() : "";
      const isInTxData = txDataStr.includes(walletNoPrefix);

      // Option 3: Check if the transaction is sent to the user's wallet
      const isRecipient = tx.to && tx.to.toLowerCase() === userWalletAddressStr;

      // Debug log all verification attempts
      console.log("[verify-swap] Verification checks:", {
        isMainSender,
        isInTxData,
        isRecipient,
        // Add any additional checks here
      });

      // Allow verification to pass if ANY of the checks pass
      const walletVerified = isMainSender || isInTxData || isRecipient;

      // Skip wallet verification in development if needed
      const bypassWalletCheck = process.env.BYPASS_WALLET_CHECK === "true";

      if (!walletVerified && !bypassWalletCheck) {
        console.log("[verify-swap] User wallet not found in transaction!");
        return NextResponse.json(
          {
            error: "Unauthorized",
            message: "Transaction does not involve the user's wallet",
          },
          { status: 401 }
        );
      }

      console.log("[verify-swap] Transaction verification passed!");

      // For swap missions, verify that the transaction is valid
      if (missionId.startsWith("swap_")) {
        const requiredToken = MISSION_TOKEN_MAP[missionId];
        console.log("[verify-swap] Checking swap for token:", {
          missionId,
          requiredToken,
        });
        if (!requiredToken) {
          return NextResponse.json(
            { error: "Bad Request", message: "Invalid swap mission ID" },
            { status: 400 }
          );
        }

        // Verify transaction exists and was confirmed on-chain
        // In the future, we can enhance this to decode transaction data
        // and verify it's interacting with the expected tokens
        if (!tx.blockNumber) {
          return NextResponse.json(
            {
              error: "Bad Request",
              message: "Transaction has not been confirmed on-chain yet",
            },
            { status: 400 }
          );
        }
      }

      // For liquidity mission, verify that the transaction exists and is confirmed
      if (missionId === "add_liquidity") {
        // Verify transaction is confirmed on-chain
        // In the future, we can enhance this to decode transaction data
        // and verify it's an addLiquidity call
        if (!tx.blockNumber) {
          return NextResponse.json(
            {
              error: "Bad Request",
              message: "Transaction has not been confirmed on-chain yet",
            },
            { status: 400 }
          );
        }
      }
    } catch (error) {
      console.error("Error verifying transaction:", error);
      return NextResponse.json(
        {
          error: "Bad Request",
          message:
            "Failed to verify transaction. Make sure the transaction hash is valid.",
        },
        { status: 400 }
      );
    }

    // Record mission completion
    console.log("[verify-swap] Recording mission completion...");
    const { error: missionError } = await adminClient
      .from("user_completed_missions")
      .insert({
        user_id: userId,
        mission_id: missionId,
        points_awarded: true,
        completed_at: new Date().toISOString(),
      });

    if (missionError) {
      console.error(
        "[verify-swap] Error recording mission completion:",
        missionError
      );

      // Handle potential unique constraint violation gracefully
      if (missionError.code === "23505") {
        // unique_violation
        console.log("[verify-swap] Mission already completed (duplicate key)");
        return NextResponse.json({
          success: true,
          alreadyCompleted: true,
          message: "Mission already completed.",
        });
      }

      return NextResponse.json(
        {
          error: "Database Error",
          message: "Failed to record mission completion",
        },
        { status: 500 }
      );
    }

    console.log("[verify-swap] Mission completion recorded successfully");

    // Award points using our points service
    console.log("[verify-swap] Awarding points:", pointsValue);
    const pointsResult = await awardPoints({
      userId,
      type: PointType.ONBOARDING,
      amount: pointsValue,
      description: `Completed mission: ${missionId}`,
      metadata: {
        missionId,
        txHash,
        completedAt: new Date().toISOString(),
      },
      supabase: adminClient,
    });

    if (!pointsResult.success) {
      console.error("[verify-swap] Error awarding points:", pointsResult.error);
      return NextResponse.json(
        { error: "Database Error", message: "Failed to award points" },
        { status: 500 }
      );
    }

    console.log("[verify-swap] Points awarded successfully:", pointsValue);
    return NextResponse.json({
      success: true,
      message: `Successfully awarded ${pointsValue} points for completing mission: ${missionId}`,
      points: pointsValue,
    });
  } catch (error) {
    console.error("[verify-swap] Unhandled error:", error);
    return NextResponse.json(
      { error: "Server Error", message: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}
