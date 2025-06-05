import { SupabaseClient } from "@supabase/supabase-js";
import { getNftMultiplierById } from "@/lib/constants/nft-collections";

/**
 * Points Service
 *
 * This service handles all point-related operations in the system. Points are awarded for various activities:
 *
 * Funded Points:
 * - Pool commitment/deposit (15 points per USDC to depositor)
 *
 * Raised Points:
 * - Creating a pool (50 base points to creator)
 * - Receiving commitments to your pool (25 points per USDC committed to creator)
 * - Pool reaching EXECUTING status (30 points per USDC raised to creator)
 *
 * Onboarding Points:
 * - Completing missions like linking X account (1,000 points)
 * - Following on X (1,000 points)
 * - Creating a pool (5,000 points)
 *
 * Check-in Points:
 * - Daily check-in (100 points, limited to once per 24 hours)
 */

// Define point types as an enum for better type safety
export enum PointType {
  FUNDED = "funded",
  RAISED = "raised",
  ONBOARDING = "onboarding",
  CHECKIN = "checkin",
  REFERRAL = "referral",
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
    [PointType.REFERRAL]: "referral_points",
  };

  const column = columnMap[type];
  if (!column) {
    return { success: false, error: `Unknown point type: ${type}` };
  }

  // Don't award points if amount is less than 1
  if (amount < 1) {
    return { success: false, error: "Point amount must be at least 1" };
  }

  // Check for idempotency if txHash is provided in metadata
  if (metadata.txHash) {
    // Check if we've already processed this transaction to ensure idempotency
    const { data: existingPoints, error: checkError } = await supabase
      .from("point_transactions")
      .select("id")
      .eq("user_id", userId)
      .eq("action_type", `${type}:${description}`)
      .eq("metadata->txHash", metadata.txHash)
      .maybeSingle();

    if (checkError) {
      console.error("Error checking for existing points:", checkError);
    } else if (existingPoints) {
      console.log(
        `Transaction ${metadata.txHash} already awarded points, skipping.`
      );
      return {
        success: true,
        error: "Points already awarded for this transaction",
      };
    }
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

  // If no user_points record exists, create one
  if (!data) {
    console.log(`Creating initial user_points record for user ${userId}`);

    // Initialize with zeros for all point types, except set the current point type to the awarded amount
    const initialValues = {
      user_id: userId,
      funded_points: 0,
      raised_points: 0,
      onboarding_points: 0,
      checkin_points: 0,
      referral_points: 0,
      [column]: amount,
    };

    const { error: insertError } = await supabase
      .from("user_points")
      .insert(initialValues);

    if (insertError) {
      console.error("Failed to create user_points record:", insertError);
      return { success: false, error: insertError.message };
    }

    // Now the record is created with the points already set correctly
    // No need for a separate update, continue to the transaction insertion
  } else {
    // Update existing record
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

/**
 * Get the current level multiplier for a user based on their total points
 * This matches the logic from usePointsBonus.ts
 */
export function getLevelMultiplier(totalPoints: number): number {
  // Level 10+ - 1.4x
  if (totalPoints >= 100000) return 1.4;
  // Level 8+ - 1.3x
  if (totalPoints >= 75000) return 1.3;
  // Level 6+ - 1.25x
  if (totalPoints >= 50000) return 1.25;
  // Level 4+ - 1.2x
  if (totalPoints >= 25000) return 1.2;
  // Level 2+ - 1.1x
  if (totalPoints >= 10000) return 1.1;
  // Level 1 - 1x
  return 1.0;
}

/**
 * Get user's current total points to calculate their level multiplier
 */
export async function getUserTotalPoints(
  userId: string,
  supabase: SupabaseClient
): Promise<number> {
  const { data, error } = await supabase
    .from("user_points")
    .select(
      "funded_points, raised_points, onboarding_points, checkin_points, referral_points"
    )
    .eq("user_id", userId)
    .single();

  if (error || !data) {
    return 0;
  }

  return (
    (data.funded_points || 0) +
    (data.raised_points || 0) +
    (data.onboarding_points || 0) +
    (data.checkin_points || 0) +
    (data.referral_points || 0)
  );
}

/**
 * Calculate streak multiplier based on streak count
 * This matches the logic from points.service.ts calculateStreakMultiplier
 */
function getStreakMultiplier(streakCount: number): number {
  if (streakCount <= 1) return 1.0;
  if (streakCount <= 3) return 1.1;
  if (streakCount <= 7) return 1.25;
  if (streakCount <= 14) return 1.5;
  if (streakCount <= 30) return 1.75;
  return 2.0; // 31+ days
}

/**
 * Calculate leader multiplier based on total points
 * This matches the logic from usePointsBonus.ts
 */
function getLeaderMultiplier(totalPoints: number): number {
  if (totalPoints >= 50000) return 1.5; // Top 1%
  if (totalPoints >= 25000) return 1.3; // Top 5%
  if (totalPoints >= 15000) return 1.2; // Top 10%
  if (totalPoints >= 5000) return 1.1; // Top 25%
  return 1.0;
}

/**
 * Get user's complete multiplier breakdown and total
 * Can be called from frontend or backend
 */
export async function getUserMultiplier(
  userId: string,
  supabase: SupabaseClient
): Promise<{
  levelMultiplier: number;
  leaderMultiplier: number;
  streakMultiplier: number;
  nftMultiplier: number;
  totalMultiplier: number;
  totalPoints: number;
  streakCount: number;
}> {
  // Get user's total points
  const totalPoints = await getUserTotalPoints(userId, supabase);

  // Get user's streak count and selected NFT collection in one query
  const { data: userData, error } = await supabase
    .from("users")
    .select(
      `
      selected_nft_collection,
      daily_checkins(streak_count)
    `
    )
    .eq("id", userId)
    .single();

  if (error) {
    console.error("Error fetching user multiplier data:", error);
    // Return base multipliers if query fails
    const levelMultiplier = getLevelMultiplier(totalPoints);
    return {
      levelMultiplier,
      leaderMultiplier: getLeaderMultiplier(totalPoints),
      streakMultiplier: 1.0,
      nftMultiplier: 1.0,
      totalMultiplier: levelMultiplier * getLeaderMultiplier(totalPoints),
      totalPoints,
      streakCount: 0,
    };
  }

  // Extract data - daily_checkins is an array, get the first (should be only one)
  const streakCount = userData?.daily_checkins?.[0]?.streak_count || 0;
  const selectedNftCollection = userData?.selected_nft_collection || null;

  // Calculate individual multipliers
  const levelMultiplier = getLevelMultiplier(totalPoints);
  const leaderMultiplier = getLeaderMultiplier(totalPoints);
  const streakMultiplier = getStreakMultiplier(streakCount);
  const nftMultiplier = getNftMultiplierById(selectedNftCollection);

  // Calculate total multiplier (multiplicative)
  const totalMultiplier =
    levelMultiplier * leaderMultiplier * streakMultiplier * nftMultiplier;

  return {
    levelMultiplier,
    leaderMultiplier,
    streakMultiplier,
    nftMultiplier,
    totalMultiplier,
    totalPoints,
    streakCount,
  };
}

/**
 * Get just the total multiplier (simplified version)
 */
export async function getUserTotalMultiplier(
  userId: string,
  supabase: SupabaseClient
): Promise<number> {
  const result = await getUserMultiplier(userId, supabase);
  return result.totalMultiplier;
}

// Optionally, add more helpers for leaderboard, history, etc. here.

// Points system constants and utility functions

// Constants
export const DAILY_CHECKIN_POINTS = 100;
export const DAILY_CHECKIN_ACTION = "daily_checkin";
export const MIN_CHECKIN_INTERVAL_HOURS = 24;

/**
 * Calculate streak multiplier based on streak count
 * Returns both the multiplier and the actual points to award
 */
export function calculateStreakMultiplier(streakCount: number): {
  multiplier: number;
  points: number;
  tier: string;
  nextTierAt?: number;
  nextTierMultiplier?: number;
} {
  let multiplier: number;
  let tier: string;
  let nextTierAt: number | undefined;
  let nextTierMultiplier: number | undefined;

  if (streakCount <= 1) {
    multiplier = 1.0;
    tier = "Paper Hands";
    nextTierAt = 2;
    nextTierMultiplier = 1.1;
  } else if (streakCount <= 3) {
    multiplier = 1.1;
    tier = "Hodler";
    nextTierAt = 4;
    nextTierMultiplier = 1.25;
  } else if (streakCount <= 7) {
    multiplier = 1.25;
    tier = "Degen";
    nextTierAt = 8;
    nextTierMultiplier = 1.5;
  } else if (streakCount <= 14) {
    multiplier = 1.5;
    tier = "Diamond Chad";
    nextTierAt = 15;
    nextTierMultiplier = 1.75;
  } else if (streakCount <= 30) {
    multiplier = 1.75;
    tier = "Giga Whale";
    nextTierAt = 31;
    nextTierMultiplier = 2.0;
  } else {
    multiplier = 2.0;
    tier = "Moon God";
    // No next tier - this is the max
  }

  const points = Math.floor(DAILY_CHECKIN_POINTS * multiplier);

  return {
    multiplier,
    points,
    tier,
    nextTierAt,
    nextTierMultiplier,
  };
}

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
  const amountUSDC = parseInt(amountBaseUnits) / 1e6;
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

    // Start with a base of 50 points for creating a pool
    // This will be supplemented later when deposits come in
    const pointsResult = await awardPoints({
      userId: userData.id,
      type: PointType.RAISED,
      amount: 50, // Base points for creating a pool
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
        `Awarded 50 raised points to user ${userData.id} for creating pool`
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
 * And awards referral points if the commitment came through a referral link
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
    // Calculate points based on USDC amount (15 points per USDC)
    const funderPoints = calculatePointsFromAmount(amount, 15);
    console.log("********** funderPoints", funderPoints, amount);

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

    // 1. Award points to the depositor/funder with multiplier
    const userMultiplier = await getUserTotalMultiplier(userData.id, supabase);
    const finalFunderPoints = Math.floor(funderPoints * userMultiplier);
    const bonusPoints = finalFunderPoints - funderPoints;

    console.log("userMultiplier", userMultiplier);
    const funderResult = await awardPoints({
      userId: userData.id,
      type: PointType.FUNDED,
      amount: finalFunderPoints,
      description: "pool_commitment",
      metadata: {
        poolAddress,
        tierId,
        amount,
        txHash,
        base_amount: funderPoints,
        bonus_amount: bonusPoints,
        multiplier_applied: userMultiplier,
        multiplier_eligible: true,
      },
      supabase,
    });

    if (funderResult.success) {
      console.log(
        `Awarded ${finalFunderPoints} funded points (${funderPoints} base + ${bonusPoints} bonus, ${userMultiplier}x multiplier) to user ${userData.id} for pool commitment`
      );
    } else {
      console.error("Failed to award points to funder:", funderResult.error);
    }

    // 2. Also award points to the pool creator (25 points per USDC)
    try {
      // Calculate points for the creator (25 points per USDC)
      const creatorPoints = calculatePointsFromAmount(amount, 25);

      if (creatorPoints === 0) {
        return { success: funderResult.success, error: funderResult.error };
      }

      // Find the pool creator
      const { data: poolData, error: poolFetchError } = await supabase
        .from("pools")
        .select("creator_id, id")
        .ilike("contract_address", poolAddress)
        .maybeSingle();

      if (poolFetchError) {
        console.error("Error fetching pool for creator:", poolFetchError);
        return { success: funderResult.success, error: funderResult.error };
      }

      if (!poolData || !poolData.creator_id) {
        console.log(`Pool not found or has no creator: ${poolAddress}`);
        return { success: funderResult.success, error: funderResult.error };
      }

      // Award points directly to the creator using creator_id with multiplier
      const creatorMultiplier = await getUserTotalMultiplier(
        poolData.creator_id,
        supabase
      );
      const finalCreatorPoints = Math.floor(creatorPoints * creatorMultiplier);
      const creatorBonusPoints = finalCreatorPoints - creatorPoints;

      const creatorResult = await awardPoints({
        userId: poolData.creator_id,
        type: PointType.RAISED,
        amount: finalCreatorPoints,
        description: "received_commitment",
        metadata: {
          poolAddress,
          tierId,
          amount,
          funderAddress: userAddress,
          txHash,
          base_amount: creatorPoints,
          bonus_amount: creatorBonusPoints,
          multiplier_applied: creatorMultiplier,
          multiplier_eligible: true,
        },
        supabase,
      });

      if (creatorResult.success) {
        console.log(
          `Awarded ${finalCreatorPoints} raised points (${creatorPoints} base + ${creatorBonusPoints} bonus, ${creatorMultiplier}x multiplier) to creator ${poolData.creator_id} for receiving commitment`
        );
      } else {
        console.error(
          "Failed to award points to creator:",
          creatorResult.error
        );
      }

      // 3. Award referral points if this commitment came through a referral link
      let referralResult: { success: boolean; error?: string } = {
        success: true,
      }; // Default to success if no referral

      try {
        // Check if this user has an active referral for this pool
        const { data: referralData, error: referralCheckError } = await supabase
          .from("user_referrals")
          .select("referrer_twitter_username")
          .eq("user_id", userData.id)
          .eq("pool_id", poolData.id) // We'll need to get the actual pool ID, not creator_id
          .eq("used", false)
          .gt("expires_at", new Date().toISOString())
          .maybeSingle();

        if (referralCheckError) {
          console.error("Error checking for referrals:", referralCheckError);
        } else if (referralData) {
          // Award referral points
          referralResult = await awardReferralPoints({
            referrerTwitterUsername: referralData.referrer_twitter_username,
            poolAddress,
            amount,
            txHash,
            supabase,
          });

          if (referralResult.success) {
            console.log(
              `Awarded referral points to ${referralData.referrer_twitter_username} for pool commitment referral`
            );

            // Mark the referral as used
            await supabase
              .from("user_referrals")
              .update({ used: true })
              .eq("user_id", userData.id)
              .eq(
                "referrer_twitter_username",
                referralData.referrer_twitter_username
              );
          } else {
            console.error(
              "Failed to award referral points:",
              referralResult.error
            );
          }
        }
      } catch (referralError: any) {
        console.error("Error processing referral points:", referralError);
        referralResult = { success: false, error: referralError.message };
      }

      return {
        success:
          funderResult.success &&
          creatorResult.success &&
          referralResult.success,
        error: !referralResult.success ? referralResult.error : undefined,
      };
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
 * Awards 30 points per USDC raised
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
      .select("creator_id, raised_amount")
      .ilike("contract_address", poolAddress)
      .maybeSingle();

    if (poolFetchError) {
      console.error("Error fetching pool for creator:", poolFetchError);
      return { success: false, error: poolFetchError.message };
    }

    if (!poolData || !poolData.creator_id || !poolData.raised_amount) {
      console.log(
        `Pool not found, has no creator, or no raised amount: ${poolAddress}`
      );
      return {
        success: false,
        error: "Pool not found, has no creator, or no raised amount",
      };
    }

    // Calculate points based on raised amount (30 points per USDC)
    const executingPoints = calculatePointsFromAmount(
      poolData.raised_amount.toString(),
      30
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

    // Award bonus points for pool reaching executing status directly to creator with multiplier
    const creatorMultiplier = await getUserTotalMultiplier(
      poolData.creator_id,
      supabase
    );
    const finalExecutingPoints = Math.floor(
      executingPoints * creatorMultiplier
    );
    const bonusPoints = finalExecutingPoints - executingPoints;

    const pointsResult = await awardPoints({
      userId: poolData.creator_id,
      type: PointType.RAISED,
      amount: finalExecutingPoints,
      description: "pool_executing",
      metadata: {
        poolAddress,
        statusNum,
        statusString,
        raisedAmount: poolData.raised_amount.toString(),
        txHash,
        base_amount: executingPoints,
        bonus_amount: bonusPoints,
        multiplier_applied: creatorMultiplier,
        multiplier_eligible: true,
      },
      supabase,
    });

    if (pointsResult.success) {
      console.log(
        `Awarded ${finalExecutingPoints} bonus raised points (${executingPoints} base + ${bonusPoints} bonus, ${creatorMultiplier}x multiplier) to user ${poolData.creator_id} for pool reaching EXECUTING status`
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
 * Applies streak multiplier based on current streak count
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
}): Promise<{
  success: boolean;
  error?: string;
  timeRemaining?: number;
  pointsAwarded?: number;
  multiplierInfo?: ReturnType<typeof calculateStreakMultiplier>;
}> {
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

    // Calculate streak multiplier and actual points to award
    const multiplierInfo = calculateStreakMultiplier(streakCount);
    const pointsToAward = multiplierInfo.points;

    // Award check-in points with multiplier applied
    const pointsResult = await awardPoints({
      userId,
      type: PointType.CHECKIN,
      amount: pointsToAward,
      description: DAILY_CHECKIN_ACTION,
      metadata: {
        checkin_time: timestamp.toISOString(),
        streak_count: streakCount,
        base_points: DAILY_CHECKIN_POINTS,
        multiplier: multiplierInfo.multiplier,
        points_awarded: pointsToAward,
        streak_tier: multiplierInfo.tier,
      },
      supabase,
    });

    if (pointsResult.success) {
      console.log(
        `Awarded ${pointsToAward} check-in points (${multiplierInfo.multiplier}x multiplier) to user ${userId} for ${streakCount} day streak`
      );
      return {
        success: true,
        pointsAwarded: pointsToAward,
        multiplierInfo,
      };
    } else {
      return pointsResult;
    }
  } catch (error: any) {
    console.error("Error awarding points for daily check-in:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Awards referral points to a user when someone funds through their referral link
 */
export async function awardReferralPoints({
  referrerTwitterUsername,
  poolAddress,
  amount,
  txHash,
  supabase,
}: {
  referrerTwitterUsername: string;
  poolAddress: string;
  amount: string; // Base units
  txHash: string;
  supabase: SupabaseClient;
}): Promise<{ success: boolean; error?: string }> {
  try {
    // Calculate referral points (10 points per USDC)
    const referralPoints = calculatePointsFromAmount(amount, 10);

    if (referralPoints === 0) {
      console.log(
        `Funding amount too small for referral points: ${amount} base units`
      );
      return {
        success: false,
        error: "Funding amount too small for referral points",
      };
    }

    // Find the referrer by their Twitter username
    const { data: referrerData, error: referrerFetchError } = await supabase
      .from("users")
      .select("id")
      .eq("twitter_username", referrerTwitterUsername)
      .maybeSingle();

    if (referrerFetchError) {
      console.error(
        "Error fetching referrer for referral points:",
        referrerFetchError
      );
      return { success: false, error: referrerFetchError.message };
    }

    if (!referrerData) {
      console.log(
        `Referrer not found with Twitter username: ${referrerTwitterUsername}`
      );
      return { success: false, error: "Referrer not found" };
    }

    // Award referral points to the referrer with multiplier
    const referrerMultiplier = await getUserTotalMultiplier(
      referrerData.id,
      supabase
    );
    const finalReferralPoints = Math.floor(referralPoints * referrerMultiplier);
    const bonusPoints = finalReferralPoints - referralPoints;

    const referralResult = await awardPoints({
      userId: referrerData.id,
      type: PointType.REFERRAL,
      amount: finalReferralPoints,
      description: "pool_referral",
      metadata: {
        poolAddress,
        amount,
        txHash,
        base_amount: referralPoints,
        bonus_amount: bonusPoints,
        multiplier_applied: referrerMultiplier,
        multiplier_eligible: true,
        referred_twitter_username: referrerTwitterUsername,
      },
      supabase,
    });

    if (referralResult.success) {
      console.log(
        `Awarded ${finalReferralPoints} referral points (${referralPoints} base + ${bonusPoints} bonus, ${referrerMultiplier}x multiplier) to user ${referrerData.id} for pool referral`
      );
    } else {
      console.error("Failed to award referral points:", referralResult.error);
    }

    return referralResult;
  } catch (error: any) {
    console.error("Error awarding referral points:", error);
    return { success: false, error: error.message };
  }
}
