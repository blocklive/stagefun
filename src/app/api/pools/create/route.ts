import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest, getSupabaseAdmin } from "@/lib/auth/server";

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
      if (tier.rewardItems?.length) {
        tier.rewardItems.forEach((itemId: string) => {
          // Skip NFT rewards
          if (itemId !== "nft" && !allFrontendRewardItemsMap.has(itemId)) {
            // Create reward item object using the tier info as fallback
            allFrontendRewardItemsMap.set(itemId, {
              name: tier.name,
              description: tier.description || tier.name,
              type: "MERCH", // Default type
              metadata: {},
              creator_id: poolCreatorId,
              is_active: true,
              // Track the original frontend ID
              frontendId: itemId,
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

      if (feTier.rewardItems?.length) {
        feTier.rewardItems.forEach((feRewardItemId: string) => {
          if (feRewardItemId && feRewardItemId !== "nft") {
            const dbRewardItemId = rewardIdMap.get(feRewardItemId);
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

    if (tierRewardLinks.length > 0) {
      console.log("Inserting tier reward links:", tierRewardLinks);
      const { error: tierRewardLinksError } = await adminClient
        .from("tier_reward_items")
        .insert(tierRewardLinks);

      if (tierRewardLinksError) {
        console.error(
          "Error creating tier reward links:",
          tierRewardLinksError
        );
        return { success: false, error: "Failed to link rewards to tiers" };
      }
      console.log("Successfully inserted tier reward links.");
    } else {
      console.log("No tier reward links to insert.");
    }

    return { success: true };
  } catch (error) {
    console.error("Error in createAndLinkRewardItemsBackend:", error);
    return { success: false, error: "Failed processing reward items" };
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

    // 3. Prepare Pool Data for DB Insertion (with blockchain info)
    const poolDataForInsertion = {
      id: poolData.id,
      name: poolData.name,
      ticker: poolData.ticker,
      description: poolData.description,
      target_amount: poolData.target_amount,
      cap_amount: poolData.cap_amount || poolData.target_amount,
      currency: poolData.currency || "USDC",
      token_symbol: poolData.token_symbol || "USDC",
      location: poolData.location,
      venue: poolData.venue,
      status: poolData.status || "ACTIVE",
      funding_stage: poolData.funding_stage || "ACTIVE",
      ends_at: new Date(endTimeUnix * 1000).toISOString(),
      creator_id: userId, // Use authenticated user ID instead of poolData.creator_id
      raised_amount: poolData.raised_amount || 0,
      image_url: poolData.image_url,
      social_links: poolData.social_links,
      // Add blockchain details
      blockchain_tx_hash: blockchainResult.transactionHash,
      blockchain_status: "active",
      contract_address: blockchainResult.poolAddress,
      lp_token_address: blockchainResult.lpTokenAddress,
    };

    console.log("Inserting pool into database:", poolDataForInsertion.id);

    // 4. Insert Pool
    const { data: insertedPool, error: poolError } = await adminClient
      .from("pools")
      .insert(poolDataForInsertion)
      .select()
      .single();

    if (poolError) {
      console.error("Error inserting pool:", poolError);
      return NextResponse.json(
        { error: `Database error creating pool: ${poolError.message}` },
        { status: 500 }
      );
    }
    console.log("Successfully inserted pool:", insertedPool.id);

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

        return {
          pool_id: insertedPool.id,
          name: tier.name,
          description: tier.description || `${tier.name} tier`,
          price: tier.isVariablePrice ? 0 : tier.price,
          is_variable_price: tier.isVariablePrice || false,
          min_price: tier.isVariablePrice ? tier.minPrice : null,
          max_price: tier.isVariablePrice ? tier.maxPrice : null,
          max_supply: tier.maxPatrons === 0 ? null : tier.maxPatrons,
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
      data: insertedPool,
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
