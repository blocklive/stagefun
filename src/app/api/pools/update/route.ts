import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest, getSupabaseAdmin } from "@/lib/auth/server";
import { supabase } from "@/lib/supabase";
import { validateSlug } from "@/lib/utils/slugValidation";

// Define expected request body structure for tier updates
interface UpdatePoolRequestBody {
  poolId: string;
  updates: {
    name?: string;
    description?: string;
    min_commitment?: number;
    location?: string;
    social_links?: any;
    image_url?: string | null;
    slug?: string;
    // Add other fields that can be updated here
  };
  tierUpdates?: TierUpdate[];
}

// Define the reward item structure
interface RewardItem {
  name: string;
  description: string;
  type: string;
}

interface TierUpdate {
  id?: string; // Optional for new tiers
  name: string;
  description: string;
  price: number;
  is_variable_price: boolean;
  min_price?: number;
  max_price?: number;
  max_supply?: number;
  is_active: boolean;
  image_url?: string;
  nft_metadata?: string;
  onchain_index?: number; // Add onchain_index property
  // For tracking on-chain status
  onchain_updated?: boolean;
  transaction_hash?: string;
  // Simple array of reward item IDs
  rewardItems?: string[];
  // New rewards to create
  newRewards?: Array<{
    name: string;
    description: string;
    type: string;
  }>;
}

/**
 * API route to update a pool's details
 * This uses the Supabase admin client to bypass RLS policies
 */
export async function POST(request: NextRequest) {
  try {
    // 1. Authenticate the request
    const authResult = await authenticateRequest(request);
    if (!authResult.authenticated || !authResult.userId) {
      return NextResponse.json(
        { error: authResult.error || "Unauthorized" },
        { status: authResult.statusCode || 401 }
      );
    }
    const userId = authResult.userId;
    console.log(`Authenticated user ${userId} for pool update.`);

    // 2. Parse request body
    const requestBody: UpdatePoolRequestBody = await request.json();
    const { poolId, updates, tierUpdates } = requestBody;

    console.log("Received pool update request:", {
      poolId,
      updateFields: Object.keys(updates || {}),
      hasTierUpdates: !!tierUpdates && tierUpdates.length > 0,
      tierUpdateCount: tierUpdates?.length || 0,
    });

    if (
      !poolId ||
      ((!updates || Object.keys(updates).length === 0) &&
        (!tierUpdates || tierUpdates.length === 0))
    ) {
      return NextResponse.json(
        { error: "Missing required fields in request body" },
        { status: 400 }
      );
    }

    // Get the pool to check ownership
    const { data: pool, error: poolError } = await supabase
      .from("pools")
      .select("*")
      .eq("id", poolId)
      .single();

    if (poolError) {
      console.error("Error fetching pool for ownership check:", poolError);
      return NextResponse.json(
        { error: "Failed to get pool data" },
        { status: 500 }
      );
    }

    // Verify ownership
    if (pool.creator_id !== authResult.userId) {
      return NextResponse.json(
        { error: "You don't have permission to update this pool" },
        { status: 403 }
      );
    }

    // Validate slug if provided
    if (updates && updates.slug) {
      const validation = validateSlug(updates.slug);
      if (!validation.isValid) {
        return NextResponse.json(
          { error: validation.reason || "Invalid slug format" },
          { status: 400 }
        );
      }

      // Check if slug is already in use (skip if it's the current pool's slug)
      if (updates.slug !== (pool as any).slug) {
        const { data: existingPool, error: slugCheckError } = await supabase
          .from("pools")
          .select("id")
          .eq("slug", updates.slug)
          .not("id", "eq", poolId)
          .single();

        if (existingPool) {
          return NextResponse.json(
            { error: "This URL is already taken. Please choose another." },
            { status: 400 }
          );
        }
      }
    }

    // Use admin client for all database operations to bypass RLS
    const adminSupabase = getSupabaseAdmin();

    // 3. Update the pool basic information if provided
    let updatedPool = null;
    if (updates && Object.keys(updates).length > 0) {
      const { data: updatedPoolData, error: updateError } = await adminSupabase
        .from("pools")
        .update(updates)
        .eq("id", poolId)
        .select()
        .single();

      if (updateError) {
        console.error("Error updating pool:", updateError);
        return NextResponse.json(
          { error: `Database error updating pool: ${updateError.message}` },
          { status: 500 }
        );
      }
      updatedPool = updatedPoolData;
    } else {
      updatedPool = pool;
    }

    // 4. Handle tier updates if provided
    let updatedTiers = null;
    if (tierUpdates && tierUpdates.length > 0) {
      console.log("Processing tier updates:", tierUpdates);

      // Process existing tier updates vs new tier creation separately
      const existingTierUpdates = tierUpdates.filter((tier) => tier.id);
      const newTierUpdates = tierUpdates.filter((tier) => !tier.id);

      let processedTiers = [];

      // Update existing tiers
      for (const tier of existingTierUpdates) {
        if (!tier.id) continue; // TypeScript safety

        // Extract reward items before db update
        const { rewardItems, newRewards, ...tierData } = tier;

        // 1. Update the tier data
        const { data: updatedTier, error: updateError } = await adminSupabase
          .from("tiers")
          .update(tierData)
          .eq("id", tier.id)
          .eq("pool_id", poolId)
          .select()
          .single();

        if (updateError) {
          console.error("Error updating tier:", updateError);
          return NextResponse.json(
            { error: `Failed to update tier: ${updateError.message}` },
            { status: 500 }
          );
        }

        // 2. Process rewards for this tier

        // First delete existing associations
        await adminSupabase
          .from("tier_reward_items")
          .delete()
          .eq("tier_id", tier.id);

        // Track all reward IDs that need to be linked
        let allRewardIds = rewardItems ? [...rewardItems] : [];

        // If there are new rewards to create, create them
        if (newRewards && newRewards.length > 0) {
          const rewardsToCreate = newRewards.map((reward) => ({
            name: reward.name,
            description: reward.description || "",
            type: reward.type || "default",
            creator_id: userId, // Use the authenticated user ID
            is_active: true,
            metadata: {},
          }));

          // Create the rewards in the database
          const { data: createdRewards, error: rewardError } =
            await adminSupabase
              .from("reward_items")
              .insert(rewardsToCreate)
              .select();

          if (rewardError) {
            console.error("Error creating rewards:", rewardError);
            // Continue with existing rewards even if creating new ones fails
          } else if (createdRewards) {
            // Add the new reward IDs to our list
            const newIds = createdRewards.map((reward: any) => reward.id);
            allRewardIds = [...allRewardIds, ...newIds];
          }
        }

        // Create associations for all rewards
        if (allRewardIds.length > 0) {
          const tierRewardLinks = allRewardIds.map((rewardId) => ({
            tier_id: tier.id,
            reward_item_id: rewardId,
            quantity: 1,
          }));

          const { error: linkError } = await adminSupabase
            .from("tier_reward_items")
            .insert(tierRewardLinks);

          if (linkError) {
            console.error("Error linking rewards to tier:", linkError);
            // Continue processing other tiers even if linking fails
          }
        }

        if (updatedTier) {
          processedTiers.push(updatedTier);
        }
      }

      // Insert new tiers
      for (const tier of newTierUpdates) {
        // Extract reward items before db insert
        const { rewardItems, newRewards, ...tierData } = tier;

        // Add pool_id to the tier data
        const tierToInsert = {
          ...tierData,
          pool_id: poolId,
        };

        // Get the current tier count from the database to use as onchain_index for the new tier
        const { data: tierCountData } = await adminSupabase
          .from("tiers")
          .select("id")
          .eq("pool_id", poolId);

        // Set the onchain_index to the current count of tiers for this pool
        const currentTierCount = tierCountData ? tierCountData.length : 0;
        tierToInsert.onchain_index = currentTierCount;

        // 1. Insert the new tier
        const { data: newTier, error: insertError } = await adminSupabase
          .from("tiers")
          .insert(tierToInsert)
          .select()
          .single();

        if (insertError) {
          console.error("Error creating new tier:", insertError);
          return NextResponse.json(
            { error: `Failed to create new tier: ${insertError.message}` },
            { status: 500 }
          );
        }

        // 2. Process rewards for this tier

        // Track all reward IDs that need to be linked
        let allRewardIds = rewardItems ? [...rewardItems] : [];

        // If there are new rewards to create, create them
        if (newRewards && newRewards.length > 0 && newTier) {
          const rewardsToCreate = newRewards.map((reward) => ({
            name: reward.name,
            description: reward.description || "",
            type: reward.type || "default",
            creator_id: userId, // Use the authenticated user ID
            is_active: true,
            metadata: {},
          }));

          // Create the rewards in the database
          const { data: createdRewards, error: rewardError } =
            await adminSupabase
              .from("reward_items")
              .insert(rewardsToCreate)
              .select();

          if (rewardError) {
            console.error("Error creating rewards:", rewardError);
            // Continue with existing rewards even if creating new ones fails
          } else if (createdRewards) {
            // Add the new reward IDs to our list
            const newIds = createdRewards.map((reward: any) => reward.id);
            allRewardIds = [...allRewardIds, ...newIds];
          }
        }

        // Create associations for all rewards
        if (allRewardIds.length > 0 && newTier) {
          const tierRewardLinks = allRewardIds.map((rewardId) => ({
            tier_id: newTier.id,
            reward_item_id: rewardId,
            quantity: 1,
          }));

          const { error: linkError } = await adminSupabase
            .from("tier_reward_items")
            .insert(tierRewardLinks);

          if (linkError) {
            console.error("Error linking rewards to new tier:", linkError);
            // Continue processing even if linking fails
          }
        }

        if (newTier) {
          processedTiers.push(newTier);
        }
      }

      updatedTiers = processedTiers;
    }

    // 5. Return success response with updated pool data
    return NextResponse.json({
      success: true,
      data: {
        ...updatedPool,
        tiers: updatedTiers,
      },
      message: "Pool updated successfully",
    });
  } catch (error: any) {
    console.error("Error in pool update API:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
