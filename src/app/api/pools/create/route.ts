import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest, getSupabaseAdmin } from "@/lib/auth/server";
import { createClient } from "@supabase/supabase-js";
import { createPool } from "@/lib/services/pool-service";
import { REWARD_TYPES } from "@/lib/constants/strings";
import { MAX_SAFE_VALUE } from "@/lib/utils/contractValues";
import { customAlphabet } from "nanoid";

// Environment variables for Supabase Admin access
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error(
    "Missing environment variables for Supabase URL or Service Role Key"
  );
}

// Create a Supabase client with the service role key for admin privileges
const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

// Define expected request body structure
interface CreatePoolRequestBody {
  poolData: {
    id: string; // uniqueId generated on frontend
    name: string;
    ticker: string; // used as symbol on chain
    description: string;
    target_amount: number;
    cap_amount?: number;
    currency: string;
    token_amount: number;
    token_symbol: string;
    location?: string;
    venue?: string;
    status: string;
    funding_stage: string;
    ends_at: string;
    creator_id: string;
    raised_amount: number;
    image_url: string | null;
    social_links: any;
    tiers?: any[]; // Contains tier details including rewardItems linked by frontend ID
  };
  endTimeUnix: number;
  blockchainResult: {
    poolAddress: string;
    lpTokenAddress: string;
    transactionHash: string;
  };
}

// Converts "NFT", "Merchandise", "Ticket" type names to our constant values
function normalizeRewardType(type: string): string {
  const typeLower = (type || "").toLowerCase();

  switch (typeLower) {
    case "nft":
      return REWARD_TYPES.NFT;
    case "merchandise":
      return REWARD_TYPES.MERCH;
    case "ticket":
      return REWARD_TYPES.TICKET;
    case "perk":
    case "special perk":
      return REWARD_TYPES.PERK;
    default:
      return REWARD_TYPES.PERK; // Default to PERK for anything else
  }
}

// Backend version of reward item linking logic
async function createAndLinkRewardItemsBackend(
  adminClient: any,
  dbTiers: any[], // Tiers inserted into DB with their new IDs
  frontendTiers: any[], // Original tiers array from frontend containing reward info
  poolCreatorId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Extract unique reward items defined across all tiers from the frontend data
    const allFrontendRewardItemsMap = new Map();
    frontendTiers.forEach((tier) => {
      if (tier.rewardItemsData?.length) {
        tier.rewardItemsData.forEach((rewardItem: any) => {
          // Skip NFT rewards
          if (
            rewardItem.id !== "nft" &&
            !allFrontendRewardItemsMap.has(rewardItem.id)
          ) {
            // Use the actual reward item data
            allFrontendRewardItemsMap.set(rewardItem.id, {
              name: rewardItem.name,
              description: rewardItem.description,
              type: rewardItem.type || REWARD_TYPES.PERK,
              metadata: {},
              creator_id: poolCreatorId,
              is_active: true,
              // Track the original frontend ID
              frontendId: rewardItem.id,
            });
          }
        });
      }
    });

    const uniqueFrontendRewardItems = Array.from(
      allFrontendRewardItemsMap.values()
    );

    if (uniqueFrontendRewardItems.length === 0) {
      console.log("No non-NFT reward items to create.");
      return { success: true }; // No rewards to process
    }

    // Filter out the frontendId before insertion
    const rewardItemsToInsert = uniqueFrontendRewardItems.map(
      ({ frontendId, ...rest }) => rest
    );

    console.log("Inserting reward items:", rewardItemsToInsert);
    const { data: createdRewardItems, error: rewardItemsError } =
      await adminClient
        .from("reward_items")
        .insert(rewardItemsToInsert)
        .select();

    if (rewardItemsError) {
      console.error("Error creating reward items:", rewardItemsError);
      return { success: false, error: "Failed to create reward items" };
    }
    console.log("Successfully inserted reward items:", createdRewardItems);

    // Create a map of frontend reward ID to new database ID
    const rewardIdMap = new Map();
    createdRewardItems.forEach((dbItem: any, index: number) => {
      const frontendId = uniqueFrontendRewardItems[index]?.frontendId;
      if (frontendId) {
        rewardIdMap.set(frontendId, dbItem.id);
      }
    });

    // Create a map of frontend tier name to new database tier ID
    const dbTierIdMap = new Map(
      dbTiers.map((dbTier) => [dbTier.name, dbTier.id])
    );

    // Now, create the tier-reward links
    const tierRewardLinks: any[] = [];
    frontendTiers.forEach((feTier) => {
      const dbTierId = dbTierIdMap.get(feTier.name);
      if (!dbTierId) {
        console.warn(
          `Could not find DB tier ID for frontend tier: ${feTier.name}`
        );
        return; // Skip if tier mapping failed
      }

      if (feTier.rewardItemsData?.length) {
        feTier.rewardItemsData.forEach((feRewardItem: any) => {
          if (feRewardItem.id && feRewardItem.id !== "nft") {
            const dbRewardItemId = rewardIdMap.get(feRewardItem.id);
            if (dbRewardItemId) {
              tierRewardLinks.push({
                tier_id: dbTierId,
                reward_item_id: dbRewardItemId,
                quantity: 1, // Default quantity
              });
            }
          }
        });
      }
    });

    if (tierRewardLinks.length === 0) {
      console.log("No tier-reward links to create");
      return { success: true };
    }

    console.log("Creating tier-reward links:", tierRewardLinks);
    const { error: linkError } = await adminClient
      .from("tier_reward_items")
      .insert(tierRewardLinks);

    if (linkError) {
      console.error("Error creating tier-reward links:", linkError);
      return { success: false, error: "Failed to link rewards to tiers" };
    }

    console.log("Successfully created tier-reward links");
    return { success: true };
  } catch (error: any) {
    console.error("Unhandled error in reward item linking:", error);
    return { success: false, error: `${error.message || "Unknown error"}` };
  }
}

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
    console.log(`Authenticated user ${userId} for pool creation.`);

    // 2. Parse request body
    const { poolData, endTimeUnix, blockchainResult }: CreatePoolRequestBody =
      await request.json();
    console.log("Received pool creation request data:", {
      poolId: poolData.id,
      name: poolData.name,
      endTimeUnix,
      blockchainAddress: blockchainResult.poolAddress,
    });

    if (
      !poolData ||
      !endTimeUnix ||
      !blockchainResult ||
      !poolData.id ||
      !poolData.name ||
      !poolData.ticker ||
      !poolData.target_amount ||
      !blockchainResult.poolAddress ||
      !blockchainResult.lpTokenAddress ||
      !blockchainResult.transactionHash
    ) {
      return NextResponse.json(
        { error: "Missing required fields in request body" },
        { status: 400 }
      );
    }

    const adminClient = getSupabaseAdmin();

    // Generate a unique 8-character lowercase alphanumeric slug
    const alphabet = "0123456789abcdefghijklmnopqrstuvwxyz"; // Only lowercase and numbers
    const nanoid = customAlphabet(alphabet, 8);
    const slug = nanoid();

    // 3. Prepare Pool Data for DB Insertion (with blockchain info and slug)
    const poolDataForInsertion = {
      id: poolData.id,
      name: poolData.name,
      ticker: poolData.ticker,
      description: poolData.description,
      target_amount: poolData.target_amount,
      cap_amount: poolData.cap_amount || poolData.target_amount,
      currency: poolData.currency,
      token_symbol: poolData.token_symbol,
      location: poolData.location,
      venue: poolData.venue,
      status: poolData.status || "ACTIVE",
      funding_stage: poolData.funding_stage || "ACTIVE",
      ends_at: new Date(endTimeUnix * 1000).toISOString(),
      creator_id: userId, // Ensure creator_id is the authenticated user
      raised_amount: poolData.raised_amount || 0,
      image_url: poolData.image_url || null,
      social_links: poolData.social_links || {},
      // Blockchain details
      contract_address: blockchainResult.poolAddress,
      lp_token_address: blockchainResult.lpTokenAddress,
      blockchain_tx_hash: blockchainResult.transactionHash,
      blockchain_status: "active",
      slug: slug, // Add the generated slug
    };

    // 4. Create Pool in DB
    console.log("Attempting to insert pool data:", poolDataForInsertion);
    const { data: createdPool, error: createPoolError } = await adminClient
      .from("pools")
      .insert(poolDataForInsertion)
      .select()
      .single();

    if (createPoolError) {
      console.error("Error inserting pool:", createPoolError);
      return NextResponse.json(
        { error: `Database error creating pool: ${createPoolError.message}` },
        { status: 500 }
      );
    }
    console.log("Successfully inserted pool:", createdPool.id);

    // 5. Insert Tiers
    let insertedTiers: any[] = [];
    if (poolData.tiers && poolData.tiers.length > 0) {
      console.log(`Preparing ${poolData.tiers.length} tiers for insertion`);

      // CRITICAL: Never store base64 images in the database!
      // - Always store URLs to images in Supabase storage
      // - Base64 images can be megabytes in size and will break database indexes
      // - The tier.imageUrl and tier.nftMetadata fields should ONLY contain URLs
      // - If you see a base64 string here, it means something went wrong in the upload process
      const tiersToInsert = poolData.tiers.map((tier: any) => {
        // Validate no base64 images are being stored
        if (tier.imageUrl?.startsWith("data:")) {
          throw new Error(
            `Cannot store base64 image in database for tier "${tier.name}". Upload to storage first.`
          );
        }

        // For max_price, ensure it's a value the database can handle
        const maxPrice = tier.isVariablePrice ? tier.maxPrice : null;

        // For maxPatrons, ensure it's a value the database can handle
        const maxPatrons = tier.maxPatrons;

        return {
          pool_id: createdPool.id,
          name: tier.name,
          description: tier.description || `${tier.name} tier`,
          price: tier.isVariablePrice ? 0 : tier.price,
          is_variable_price: tier.isVariablePrice || false,
          min_price: tier.isVariablePrice ? tier.minPrice : null,
          max_price: maxPrice, // Use our processed value - now keeping MAX_SAFE_VALUE intact
          max_supply: maxPatrons, // Keep the original value (already MAX_SAFE_VALUE for uncapped)
          current_supply: 0,
          is_active: tier.isActive !== undefined ? tier.isActive : true,
          nft_metadata: tier.nftMetadata || null, // Save metadata URL to database
          image_url: tier.imageUrl || null, // Save image URL to database
        };
      });

      const { data: dbTiers, error: tiersError } = await adminClient
        .from("tiers")
        .insert(tiersToInsert)
        .select();

      if (tiersError) {
        console.error("Error inserting tiers:", tiersError);
        return NextResponse.json(
          { error: `Database error creating tiers: ${tiersError.message}` },
          { status: 500 }
        );
      }
      insertedTiers = dbTiers || [];
      console.log(`Successfully inserted ${insertedTiers.length} tiers`);

      // 6. Create and Link Reward Items
      if (insertedTiers.length > 0) {
        console.log("Processing reward items for tiers");
        const rewardResult = await createAndLinkRewardItemsBackend(
          adminClient,
          insertedTiers,
          poolData.tiers,
          userId
        );

        if (!rewardResult.success) {
          console.error("Failed to process reward items:", rewardResult.error);
          // We don't fail the whole request if rewards fail - we'll just log the error
          // This is to maintain compatibility with existing frontend behavior
        } else {
          console.log("Successfully processed reward items");
        }
      }
    } else {
      console.log("No tiers provided in the request");
    }

    // 7. Success Response
    console.log("Pool creation process completed successfully via API");
    return NextResponse.json({
      success: true,
      message: "Pool created successfully",
      data: createdPool,
    });
  } catch (error: any) {
    console.error("Unhandled error in /api/pools/create:", error);
    return NextResponse.json(
      {
        success: false,
        error: `Internal server error: ${error.message || "Unknown error"}`,
      },
      { status: 500 }
    );
  }
}
