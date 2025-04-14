import { SupabaseClient } from "@supabase/supabase-js";

// Define point types as an enum for better type safety
export enum PointType {
  FUNDED = "funded",
  RAISED = "raised",
  ONBOARDING = "onboarding",
  CHECKIN = "checkin",
}

export interface AwardPointsParams {
  userId: string;
  type: PointType;
  amount: number;
  description: string;
  metadata?: Record<string, any>;
  supabase: SupabaseClient;
}

/**
 * Awards points to a user, updates the correct column in user_points,
 * and logs the transaction in point_transactions.
 */
export async function awardPoints({
  userId,
  type,
  amount,
  description,
  metadata = {},
  supabase,
}: AwardPointsParams): Promise<{ success: boolean; error?: string }> {
  // Map point type to column
  const columnMap: Record<PointType, string> = {
    [PointType.FUNDED]: "funded_points",
    [PointType.RAISED]: "raised_points",
    [PointType.ONBOARDING]: "onboarding_points",
    [PointType.CHECKIN]: "checkin_points",
  };

  const column = columnMap[type];
  if (!column) {
    return { success: false, error: `Unknown point type: ${type}` };
  }

  // Don't award points if amount is less than 1
  if (amount < 1) {
    return { success: false, error: "Point amount must be at least 1" };
  }

  // Fetch current value
  const { data, error: fetchError } = await supabase
    .from("user_points")
    .select(column)
    .eq("user_id", userId)
    .maybeSingle();

  if (fetchError) {
    console.error("Failed to fetch user_points:", fetchError);
    return { success: false, error: fetchError.message };
  }

  const currentValue = (data as Record<string, any>)?.[column] ?? 0;
  const newValue = Number(currentValue) + amount;

  // NOTE: This is not perfectly atomic. For high-concurrency, use a Postgres function/RPC.
  const { error: updateError } = await supabase
    .from("user_points")
    .update({ [column]: newValue })
    .eq("user_id", userId);

  if (updateError) {
    console.error("Failed to update user_points:", updateError);
    return { success: false, error: updateError.message };
  }

  // Insert into point_transactions
  const { error: insertError } = await supabase
    .from("point_transactions")
    .insert({
      user_id: userId,
      amount,
      action_type: `${type}:${description}`,
      created_at: new Date().toISOString(),
      metadata,
    });

  if (insertError) {
    console.error("Failed to insert point transaction:", insertError);
    return { success: false, error: insertError.message };
  }

  return { success: true };
}

// Optionally, add more helpers for leaderboard, history, etc. here.

// Points system constants and utility functions

// Constants
export const DAILY_CHECKIN_POINTS = 100;
export const DAILY_CHECKIN_ACTION = "daily_checkin";
export const MIN_CHECKIN_INTERVAL_HOURS = 24;

/**
 * Format the time remaining until next claim
 */
export function formatTimeRemaining(milliseconds: number): string {
  if (milliseconds <= 0) {
    return "Available now";
  }

  const seconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) {
    return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  } else {
    return `${seconds}s`;
  }
}

export const checkRecentMissionCompletions = async (
  supabase: any,
  userId: string
): Promise<{ missionId: string; points: number } | null> => {
  try {
    // Get the most recent mission completion within the last minute
    const { data, error } = await supabase
      .from("user_completed_missions")
      .select("mission_id, completed_at")
      .eq("user_id", userId)
      .order("completed_at", { ascending: false })
      .limit(1);

    if (error) {
      console.error("Error checking recent mission completions:", error);
      return null;
    }

    if (!data || data.length === 0) {
      return null;
    }

    const mostRecentCompletion = data[0];
    const completionTime = new Date(mostRecentCompletion.completed_at);
    const now = new Date();

    // Only check missions completed in the last minute
    if (now.getTime() - completionTime.getTime() <= 60000) {
      // Map mission IDs to point values
      const missionPoints: Record<string, number> = {
        link_x: 10000,
        follow_x: 10000,
        create_pool: 50000,
      };

      const points = missionPoints[mostRecentCompletion.mission_id] || 0;

      if (points > 0) {
        return {
          missionId: mostRecentCompletion.mission_id,
          points,
        };
      }
    }

    return null;
  } catch (err) {
    console.error("Error in checkRecentMissionCompletions:", err);
    return null;
  }
};

/**
 * Converts USDC amount in base units (6 decimals) to a point value
 * with a minimum of 1 point if the calculation is positive
 */
function calculatePointsFromAmount(
  amountBaseUnits: string,
  multiplier: number
): number {
  // Convert from base units (6 decimals in USDC) to USDC
  const amountUSDC = Math.floor(parseInt(amountBaseUnits) / 1e6);
  // Apply multiplier
  const points = amountUSDC * multiplier;
  // Return points only if at least 1, otherwise 0
  return points >= 1 ? Math.floor(points) : 0;
}

/**
 * Awards points to a user for creating a funding pool
 */
export async function awardPointsForPoolCreation({
  creatorAddress,
  poolAddress,
  poolName,
  uniqueId,
  txHash,
  supabase,
}: {
  creatorAddress: string;
  poolAddress: string;
  poolName: string;
  uniqueId: string;
  txHash: string;
  supabase: SupabaseClient;
}): Promise<{ success: boolean; error?: string }> {
  try {
    // Find the user by their wallet address
    const { data: userData, error: userFetchError } = await supabase
      .from("users")
      .select("id")
      .ilike("smart_wallet_address", creatorAddress) // Case-insensitive search
      .maybeSingle();

    if (userFetchError) {
      console.error(
        "Error fetching user for pool creation points:",
        userFetchError
      );
      return { success: false, error: userFetchError.message };
    }

    if (!userData) {
      console.log(`Creator not found with wallet address ${creatorAddress}`);
      return { success: false, error: "Creator not found" };
    }

    // Start with a base of 500 points for creating a pool
    // This will be supplemented later when deposits come in
    const pointsResult = await awardPoints({
      userId: userData.id,
      type: PointType.RAISED,
      amount: 500, // Base points for creating a pool
      description: "created_pool",
      metadata: {
        poolAddress,
        poolName,
        uniqueId,
        txHash,
      },
      supabase,
    });

    if (pointsResult.success) {
      console.log(
        `Awarded 500 raised points to user ${userData.id} for creating pool`
      );
    }

    return pointsResult;
  } catch (error: any) {
    console.error("Error awarding points for pool creation:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Awards points to a user for committing to a pool (depositing funds)
 * Also awards points to the pool creator based on the deposit amount
 */
export async function awardPointsForPoolCommitment({
  userAddress,
  poolAddress,
  tierId,
  amount,
  txHash,
  supabase,
}: {
  userAddress: string;
  poolAddress: string;
  tierId: number;
  amount: string; // Base units
  txHash: string;
  supabase: SupabaseClient;
}): Promise<{ success: boolean; error?: string }> {
  try {
    // Calculate points based on USDC amount (7 points per USDC)
    const funderPoints = calculatePointsFromAmount(amount, 7);

    if (funderPoints === 0) {
      console.log(
        `Commitment amount too small for points: ${amount} base units`
      );
      return {
        success: false,
        error: "Commitment amount too small for points",
      };
    }

    // Find the user who made the commitment
    const { data: userData, error: userFetchError } = await supabase
      .from("users")
      .select("id")
      .ilike("smart_wallet_address", userAddress) // Case-insensitive search
      .maybeSingle();

    if (userFetchError) {
      console.error(
        "Error fetching user for pool commitment points:",
        userFetchError
      );
      return { success: false, error: userFetchError.message };
    }

    if (!userData) {
      console.log(`User not found with wallet address ${userAddress}`);
      return { success: false, error: "User not found" };
    }

    // 1. Award points to the depositor/funder
    const funderResult = await awardPoints({
      userId: userData.id,
      type: PointType.FUNDED,
      amount: funderPoints,
      description: "pool_commitment",
      metadata: {
        poolAddress,
        tierId,
        amount,
        txHash,
      },
      supabase,
    });

    if (funderResult.success) {
      console.log(
        `Awarded ${funderPoints} funded points to user ${userData.id} for pool commitment`
      );
    } else {
      console.error("Failed to award points to funder:", funderResult.error);
    }

    // 2. Also award points to the pool creator (9 points per USDC)
    try {
      // Calculate points for the creator (9 points per USDC)
      const creatorPoints = calculatePointsFromAmount(amount, 9);

      if (creatorPoints === 0) {
        return { success: funderResult.success, error: funderResult.error };
      }

      // Find the pool creator
      const { data: poolData, error: poolFetchError } = await supabase
        .from("pools")
        .select("creator_address")
        .ilike("contract_address", poolAddress)
        .maybeSingle();

      if (poolFetchError) {
        console.error("Error fetching pool for creator:", poolFetchError);
        return { success: funderResult.success, error: funderResult.error };
      }

      if (!poolData || !poolData.creator_address) {
        console.log(`Pool not found or has no creator: ${poolAddress}`);
        return { success: funderResult.success, error: funderResult.error };
      }

      // Find the creator's user ID
      const { data: creatorData, error: creatorFetchError } = await supabase
        .from("users")
        .select("id")
        .ilike("smart_wallet_address", poolData.creator_address)
        .maybeSingle();

      if (creatorFetchError) {
        console.error("Error fetching creator for points:", creatorFetchError);
        return { success: funderResult.success, error: funderResult.error };
      }

      if (!creatorData) {
        console.log(
          `Creator not found with wallet address ${poolData.creator_address}`
        );
        return { success: funderResult.success, error: funderResult.error };
      }

      // Award points to the creator
      const creatorResult = await awardPoints({
        userId: creatorData.id,
        type: PointType.RAISED,
        amount: creatorPoints,
        description: "received_commitment",
        metadata: {
          poolAddress,
          tierId,
          amount,
          funderAddress: userAddress,
          txHash,
        },
        supabase,
      });

      if (creatorResult.success) {
        console.log(
          `Awarded ${creatorPoints} raised points to creator ${creatorData.id} for receiving commitment`
        );
      } else {
        console.error(
          "Failed to award points to creator:",
          creatorResult.error
        );
      }

      return { success: funderResult.success && creatorResult.success };
    } catch (creatorError: any) {
      console.error("Error awarding points to pool creator:", creatorError);
      return { success: funderResult.success, error: creatorError.message };
    }
  } catch (error: any) {
    console.error("Error awarding points for pool commitment:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Awards bonus points to a pool creator when their pool reaches EXECUTING status
 * Awards 13 points per USDC raised
 */
export async function awardPointsForPoolExecuting({
  poolAddress,
  statusNum,
  statusString,
  txHash,
  supabase,
}: {
  poolAddress: string;
  statusNum: number;
  statusString: string;
  txHash: string;
  supabase: SupabaseClient;
}): Promise<{ success: boolean; error?: string }> {
  try {
    // Only award points if the status is EXECUTING (7)
    if (statusNum !== 7) {
      return { success: false, error: "Pool status is not EXECUTING" };
    }

    // First, get the pool to find the creator and raised amount
    const { data: poolData, error: poolFetchError } = await supabase
      .from("pools")
      .select("creator_address, raised_amount")
      .ilike("contract_address", poolAddress)
      .maybeSingle();

    if (poolFetchError) {
      console.error("Error fetching pool for creator:", poolFetchError);
      return { success: false, error: poolFetchError.message };
    }

    if (!poolData || !poolData.creator_address || !poolData.raised_amount) {
      console.log(
        `Pool not found, has no creator, or no raised amount: ${poolAddress}`
      );
      return {
        success: false,
        error: "Pool not found, has no creator, or no raised amount",
      };
    }

    // Calculate points based on raised amount (13 points per USDC)
    const executingPoints = calculatePointsFromAmount(
      poolData.raised_amount.toString(),
      13
    );

    if (executingPoints === 0) {
      console.log(
        `Pool raised amount too small for bonus points: ${poolData.raised_amount}`
      );
      return {
        success: false,
        error: "Pool raised amount too small for bonus points",
      };
    }

    // Look up the creator's user ID
    const { data: userData, error: userFetchError } = await supabase
      .from("users")
      .select("id")
      .ilike("smart_wallet_address", poolData.creator_address)
      .maybeSingle();

    if (userFetchError) {
      console.error("Error fetching creator for bonus points:", userFetchError);
      return { success: false, error: userFetchError.message };
    }

    if (!userData) {
      console.log(
        `Creator not found with wallet address ${poolData.creator_address}`
      );
      return { success: false, error: "Creator not found" };
    }

    // Award bonus points for pool reaching executing status
    const pointsResult = await awardPoints({
      userId: userData.id,
      type: PointType.RAISED,
      amount: executingPoints,
      description: "pool_executing",
      metadata: {
        poolAddress,
        statusNum,
        statusString,
        raisedAmount: poolData.raised_amount.toString(),
        txHash,
      },
      supabase,
    });

    if (pointsResult.success) {
      console.log(
        `Awarded ${executingPoints} bonus raised points to user ${userData.id} for pool reaching EXECUTING status`
      );
    }

    return pointsResult;
  } catch (error: any) {
    console.error("Error awarding bonus points for executing pool:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Awards points to a user for daily check-in
 * Validates that user hasn't checked in too recently
 */
export async function awardPointsForDailyCheckin({
  userId,
  timestamp = new Date(),
  streakCount = 1,
  supabase,
}: {
  userId: string;
  timestamp?: Date;
  streakCount?: number;
  supabase: SupabaseClient;
}): Promise<{ success: boolean; error?: string; timeRemaining?: number }> {
  try {
    // Check for recent check-ins to prevent abuse
    const minIntervalMs = MIN_CHECKIN_INTERVAL_HOURS * 60 * 60 * 1000;

    // Get user's last check-in - using the combined action_type format
    const { data: lastCheckin, error: fetchError } = await supabase
      .from("point_transactions")
      .select("created_at")
      .eq("user_id", userId)
      .eq("action_type", `${PointType.CHECKIN}:${DAILY_CHECKIN_ACTION}`)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (fetchError) {
      console.error("Error fetching last check-in:", fetchError);
      return { success: false, error: fetchError.message };
    }

    // If user has checked in before, validate time elapsed
    if (lastCheckin) {
      const lastCheckinTime = new Date(lastCheckin.created_at).getTime();
      const currentTime = timestamp.getTime();
      const timeElapsed = currentTime - lastCheckinTime;

      // If not enough time has passed, return error with time remaining
      if (timeElapsed < minIntervalMs) {
        const timeRemaining = minIntervalMs - timeElapsed;
        return {
          success: false,
          error: "Too soon for another check-in",
          timeRemaining,
        };
      }
    }

    // Award check-in points
    const pointsResult = await awardPoints({
      userId,
      type: PointType.CHECKIN,
      amount: DAILY_CHECKIN_POINTS,
      description: DAILY_CHECKIN_ACTION,
      metadata: {
        checkin_time: timestamp.toISOString(),
        streak_count: streakCount,
      },
      supabase,
    });

    if (pointsResult.success) {
      console.log(
        `Awarded ${DAILY_CHECKIN_POINTS} check-in points to user ${userId}`
      );
      return { success: true };
    } else {
      return pointsResult;
    }
  } catch (error: any) {
    console.error("Error awarding points for daily check-in:", error);
    return { success: false, error: error.message };
  }
}
