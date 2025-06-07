import { NextRequest, NextResponse } from "next/server";
import { ethers } from "ethers";
import { AMM_CONTRACTS } from "@/lib/services/blockchain/amm-events.service";
import { getEthersProvider } from "@/lib/services/blockchain/queries.service";
import { getSupabaseAdmin } from "@/lib/services/supabase-admin";
import {
  startBlockchainSyncRun,
  completeBlockchainSyncRun,
} from "@/lib/services/blockchain/sync-tracking.service";
import { AmmPairSnapshot } from "@/lib/database/amm-types";

// API key protection
const BACKFILL_API_KEY = process.env.BACKFILL_API_KEY;

// Factory ABI - minimal interface for pair discovery
const FACTORY_ABI = [
  "function allPairsLength() external view returns (uint)",
  "function allPairs(uint) external view returns (address)",
  "function getPair(address tokenA, address tokenB) external view returns (address)",
];

// Pair ABI - minimal interface for pair details
const PAIR_ABI = [
  "function token0() external view returns (address)",
  "function token1() external view returns (address)",
  "function getReserves() external view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast)",
  "function totalSupply() external view returns (uint256)",
  "function name() external view returns (string)",
  "function symbol() external view returns (string)",
];

// Helper interface for token info (minimal)
interface TokenInfo {
  address: string;
  symbol: string;
  decimals: number;
}

// Function to get token info with fallback
const getTokenInfoWithFallback = (tokenAddress: string): TokenInfo => {
  // Basic token mapping - extend as needed
  const tokenMap: Record<string, TokenInfo> = {
    "0xf817257fed379853cde0fa4f97ab987181b1e5ea": {
      address: tokenAddress,
      symbol: "USDC",
      decimals: 6,
    },
    "0x0000000000000000000000000000000000000000": {
      address: tokenAddress,
      symbol: "MON",
      decimals: 18,
    },
    "0x4b883edfd434d74ebe82fe6db5f058e6ff08cd53": {
      address: tokenAddress,
      symbol: "WMON",
      decimals: 18,
    },
  };

  return (
    tokenMap[tokenAddress.toLowerCase()] || {
      address: tokenAddress,
      symbol: `TOKEN_${tokenAddress.slice(0, 6)}`,
      decimals: 18,
    }
  );
};

// Function to calculate TVL with MON pricing
const calculateTVL = (
  token0: TokenInfo,
  token1: TokenInfo,
  reserve0: string,
  reserve1: string,
  monPriceUsd: number = 0
): number => {
  try {
    const reserve0Raw = parseFloat(reserve0) || 0;
    const reserve1Raw = parseFloat(reserve1) || 0;

    if (reserve0Raw <= 0 || reserve1Raw <= 0) {
      return 0;
    }

    const reserve0Num = reserve0Raw / Math.pow(10, token0.decimals);
    const reserve1Num = reserve1Raw / Math.pow(10, token1.decimals);

    // For USDC pairs, TVL = 2 * USDC reserve
    if (token0.symbol === "USDC") {
      return Math.max(0, reserve0Num * 2);
    } else if (token1.symbol === "USDC") {
      return Math.max(0, reserve1Num * 2);
    }

    // For MON/WMON pairs, use actual MON price if available
    else if (monPriceUsd > 0) {
      if (token0.symbol === "MON" || token0.symbol === "WMON") {
        return Math.max(0, reserve0Num * monPriceUsd * 2);
      } else if (token1.symbol === "MON" || token1.symbol === "WMON") {
        return Math.max(0, reserve1Num * monPriceUsd * 2);
      }
    }

    // Fallback: $1 per token
    return Math.max(0, reserve0Num + reserve1Num);
  } catch (error) {
    console.error("Error calculating TVL:", error);
    return 0;
  }
};

// Function to calculate 24h volume from swap transactions
const calculate24hVolume = async (
  supabase: any,
  pairAddress: string
): Promise<number> => {
  try {
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const { data: swapTxs, error } = await supabase
      .from("amm_transactions")
      .select("amount0, amount1, amount0_out, amount1_out")
      .eq("pair_address", pairAddress)
      .eq("event_type", "swap")
      .gte("timestamp", twentyFourHoursAgo.toISOString());

    if (error || !swapTxs) {
      console.warn(`Error getting 24h volume for ${pairAddress}:`, error);
      return 0;
    }

    // Sum all swap amounts (simplified - just use amount0 for now)
    const volume = swapTxs.reduce((sum: number, tx: any) => {
      const amount0 = parseFloat(tx.amount0 || "0");
      const amount0Out = parseFloat(tx.amount0_out || "0");
      return sum + Math.max(amount0, amount0Out);
    }, 0);

    return volume / Math.pow(10, 18); // Assuming 18 decimals for simplicity
  } catch (error) {
    console.error(`Error calculating 24h volume for ${pairAddress}:`, error);
    return 0;
  }
};

// Function to create hourly snapshots for all pairs
const createHourlySnapshots = async (
  supabase: any
): Promise<{ created: number; errors: number }> => {
  try {
    console.log("🔍 Fetching all current pairs...");

    // Get all current pairs
    const { data: pairs, error: pairsError } = await supabase
      .from("amm_pairs")
      .select("*")
      .order("created_at", { ascending: false });

    if (pairsError || !pairs) {
      console.error("Error fetching pairs for snapshots:", pairsError);
      return { created: 0, errors: 1 };
    }

    console.log(`📊 Found ${pairs.length} pairs to snapshot`);

    // Calculate MON price from WMON/USDC pair
    let monPriceUsd = 0;
    const wmonUsdcPair = pairs.find((pair: any) => {
      const token0Info = getTokenInfoWithFallback(pair.token0_address);
      const token1Info = getTokenInfoWithFallback(pair.token1_address);

      return (
        (token0Info.symbol === "WMON" && token1Info.symbol === "USDC") ||
        (token0Info.symbol === "USDC" && token1Info.symbol === "WMON")
      );
    });

    if (wmonUsdcPair) {
      try {
        const token0Info = getTokenInfoWithFallback(
          wmonUsdcPair.token0_address
        );
        const token1Info = getTokenInfoWithFallback(
          wmonUsdcPair.token1_address
        );

        const reserve0 =
          parseFloat(wmonUsdcPair.reserve0) / Math.pow(10, token0Info.decimals);
        const reserve1 =
          parseFloat(wmonUsdcPair.reserve1) / Math.pow(10, token1Info.decimals);

        if (token0Info.symbol === "USDC" && reserve1 > 0) {
          monPriceUsd = reserve0 / reserve1;
        } else if (token1Info.symbol === "USDC" && reserve0 > 0) {
          monPriceUsd = reserve1 / reserve0;
        }

        console.log(`💰 MON price: $${monPriceUsd.toFixed(4)}`);
      } catch (error) {
        console.warn("Error calculating MON price for snapshots:", error);
      }
    }

    // Create snapshots for each pair
    const snapshots: Partial<AmmPairSnapshot>[] = [];
    const snapshotTimestamp = new Date();

    for (const pair of pairs) {
      try {
        const token0Info = getTokenInfoWithFallback(pair.token0_address);
        const token1Info = getTokenInfoWithFallback(pair.token1_address);

        // Calculate metrics
        const reserve0Num =
          parseFloat(pair.reserve0) / Math.pow(10, token0Info.decimals);
        const reserve1Num =
          parseFloat(pair.reserve1) / Math.pow(10, token1Info.decimals);

        const tvlUsd = calculateTVL(
          token0Info,
          token1Info,
          pair.reserve0,
          pair.reserve1,
          monPriceUsd
        );
        const priceToken0 = reserve1Num > 0 ? reserve0Num / reserve1Num : 0;
        const priceToken1 = reserve0Num > 0 ? reserve1Num / reserve0Num : 0;

        // Calculate 24h volume
        const volume24h = await calculate24hVolume(supabase, pair.pair_address);
        const fees24h = volume24h * 0.003; // 0.3% fee

        // Calculate APR (annualized fees / TVL)
        const apr = tvlUsd > 0 ? ((fees24h * 365) / tvlUsd) * 100 : 0;

        snapshots.push({
          pair_address: pair.pair_address,
          snapshot_timestamp: snapshotTimestamp,
          tvl_usd: tvlUsd,
          price_token0: priceToken0,
          price_token1: priceToken1,
          volume_24h: volume24h,
          fees_24h: fees24h,
          apr: apr,
          reserve0: pair.reserve0,
          reserve1: pair.reserve1,
          total_supply: pair.total_supply,
        });

        console.log(
          `📸 ${token0Info.symbol}/${token1Info.symbol}: TVL=$${tvlUsd.toFixed(
            2
          )}, Vol24h=$${volume24h.toFixed(2)}`
        );
      } catch (error) {
        console.error(
          `Error creating snapshot for pair ${pair.pair_address}:`,
          error
        );
      }
    }

    // Bulk insert snapshots
    if (snapshots.length > 0) {
      const { data, error: insertError } = await supabase
        .from("amm_pair_snapshots")
        .upsert(snapshots, {
          onConflict: "pair_address,snapshot_timestamp",
          ignoreDuplicates: false,
        });

      if (insertError) {
        console.error("Error inserting snapshots:", insertError);
        return { created: 0, errors: snapshots.length };
      }

      console.log(`✅ Successfully created ${snapshots.length} snapshots`);
      return { created: snapshots.length, errors: 0 };
    }

    return { created: 0, errors: 0 };
  } catch (error) {
    console.error("Error in createHourlySnapshots:", error);
    return { created: 0, errors: 1 };
  }
};

export async function GET(req: NextRequest) {
  const searchParams = new URL(req.url).searchParams;
  let syncRunId: string | null = null;

  try {
    // Validate API key
    const apiKey = searchParams.get("apiKey");
    if (!apiKey || apiKey !== BACKFILL_API_KEY) {
      return NextResponse.json({ error: "Invalid API key" }, { status: 401 });
    }

    console.log("🔍 Starting AMM Pairs Discovery Backfill");
    console.log("=====================================");

    // Initialize provider and contracts
    const rpcUrl =
      process.env.ALCHEMY_RPC_URL || "https://testnet-rpc.monad.xyz";
    const provider = getEthersProvider(rpcUrl);
    const latestBlock = await provider.getBlockNumber();

    const factoryContract = new ethers.Contract(
      AMM_CONTRACTS.FACTORY,
      FACTORY_ABI,
      provider
    );

    // Get total number of pairs from Factory
    console.log(`📡 Querying Factory contract: ${AMM_CONTRACTS.FACTORY}`);
    const totalPairs = await factoryContract.allPairsLength();
    console.log(`🎯 Found ${totalPairs.toString()} total pairs in Factory`);

    if (Number(totalPairs) === 0) {
      return NextResponse.json({
        message: "No pairs found in Factory",
        totalPairs: 0,
      });
    }

    // Start tracking the sync run
    syncRunId = await startBlockchainSyncRun({
      jobName: "amm-pairs-discovery",
      source: "amm-pairs-backfill",
      startBlock: latestBlock,
      endBlock: latestBlock,
      metadata: {
        factoryAddress: AMM_CONTRACTS.FACTORY,
        totalPairs: totalPairs.toString(),
        method: "factory_query",
      },
    });

    // Initialize Supabase
    const supabase = getSupabaseAdmin();

    // Process pairs in batches (smaller batches to avoid rate limits)
    const batchSize = parseInt(searchParams.get("batchSize") || "3");
    const delayMs = parseInt(searchParams.get("delayMs") || "1000"); // 1 second delay

    let processedCount = 0;
    let upsertedPairsCount = 0;
    let errorCount = 0;

    for (let i = 0; i < Number(totalPairs); i += batchSize) {
      const batch = Math.min(batchSize, Number(totalPairs) - i);
      console.log(
        `\n🔄 Processing batch ${
          Math.floor(i / batchSize) + 1
        }: pairs ${i} to ${i + batch - 1}`
      );

      // Get pair addresses for this batch
      const pairAddressPromises = [];
      for (let j = 0; j < batch; j++) {
        pairAddressPromises.push(factoryContract.allPairs(i + j));
      }

      const pairAddresses = await Promise.all(pairAddressPromises);

      // Get pair details for each address (sequential to avoid rate limits)
      const pairDetails = [];
      for (const pairAddress of pairAddresses) {
        try {
          const pairContract = new ethers.Contract(
            pairAddress,
            PAIR_ABI,
            provider
          );

          // Sequential calls to avoid rate limiting
          const token0 = await pairContract.token0();
          await new Promise((resolve) => setTimeout(resolve, 200)); // Small delay between calls

          const token1 = await pairContract.token1();
          await new Promise((resolve) => setTimeout(resolve, 200));

          const reserves = await pairContract.getReserves();
          await new Promise((resolve) => setTimeout(resolve, 200));

          const totalSupply = await pairContract.totalSupply();
          await new Promise((resolve) => setTimeout(resolve, 200));

          const currentBlock = await provider.getBlock(latestBlock);
          if (!currentBlock) {
            throw new Error(`Failed to get block ${latestBlock}`);
          }

          pairDetails.push({
            pair_address: pairAddress.toLowerCase(),
            token0_address: token0.toLowerCase(),
            token1_address: token1.toLowerCase(),
            factory_address: AMM_CONTRACTS.FACTORY.toLowerCase(),
            created_at_block: latestBlock, // We don't know exact creation block from this method
            created_at_timestamp: new Date(currentBlock.timestamp * 1000),
            total_supply: totalSupply.toString(),
            reserve0: reserves.reserve0.toString(),
            reserve1: reserves.reserve1.toString(),
            last_sync_block: latestBlock,
            last_sync_timestamp: new Date(currentBlock.timestamp * 1000),
            created_at: new Date(),
            updated_at: new Date(),
          });

          console.log(`✅ Processed pair ${pairAddress} (${token0}/${token1})`);
        } catch (error) {
          console.error(`❌ Error processing pair ${pairAddress}:`, error);
          errorCount++;
        }
      }

      // Bulk upsert all pairs in this batch
      if (pairDetails.length > 0) {
        try {
          const { data: upsertData, error: upsertError } = await supabase
            .from("amm_pairs")
            .upsert(pairDetails, {
              onConflict: "pair_address",
              ignoreDuplicates: false, // We want to update existing pairs
            })
            .select("pair_address");

          if (upsertError) {
            console.error(`❌ Error upserting batch:`, upsertError);
            errorCount += pairDetails.length;
          } else {
            const upsertedCount = upsertData?.length || 0;
            console.log(
              `✅ Upserted ${upsertedCount} pairs in batch ${
                Math.floor(i / batchSize) + 1
              }`
            );

            // Log individual pairs for visibility
            pairDetails.forEach((pair) => {
              console.log(
                `   📝 ${pair.pair_address} (${pair.token0_address}/${pair.token1_address})`
              );
            });

            upsertedPairsCount += upsertedCount;
          }
        } catch (error) {
          console.error(`❌ Database error for batch:`, error);
          errorCount += pairDetails.length;
        }
      }

      processedCount += pairDetails.length;

      // Delay between batches
      if (delayMs > 0 && i + batchSize < Number(totalPairs)) {
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }

    console.log("\n✅ AMM Pairs Discovery Complete!");
    console.log(`📊 Results:`);
    console.log(`   - Total pairs from Factory: ${totalPairs.toString()}`);
    console.log(`   - Processed: ${processedCount}`);
    console.log(`   - Upserted pairs: ${upsertedPairsCount}`);
    console.log(`   - Errors: ${errorCount}`);

    // Create snapshots for all pairs
    console.log("\n📸 Creating hourly snapshots...");
    const snapshotResults = await createHourlySnapshots(supabase);
    console.log(`📊 Snapshot Results:`);
    console.log(`   - Snapshots created: ${snapshotResults.created}`);
    console.log(`   - Snapshot errors: ${snapshotResults.errors}`);

    // Complete the sync run
    if (syncRunId) {
      await completeBlockchainSyncRun({
        runId: syncRunId,
        eventsFound: Number(totalPairs),
        eventsProcessed: processedCount,
        eventsSkipped: 0,
        eventsFailed: errorCount,
        blocksProcessed: 1,
      });
    }

    return NextResponse.json({
      message: "AMM pairs discovery and snapshot creation completed",
      summary: {
        factoryAddress: AMM_CONTRACTS.FACTORY,
        totalPairsInFactory: totalPairs.toString(),
        processed: processedCount,
        upsertedPairs: upsertedPairsCount,
        errors: errorCount,
        snapshotsCreated: snapshotResults.created,
        snapshotErrors: snapshotResults.errors,
        syncRunId,
      },
    });
  } catch (error: any) {
    console.error("❌ Error during AMM pairs discovery:", error);

    // Record failed run
    if (syncRunId) {
      await completeBlockchainSyncRun({
        runId: syncRunId,
        status: "failed",
        errorMessage: error.message,
      });
    }

    return NextResponse.json(
      {
        error: "Failed to discover AMM pairs",
        details: error.message,
      },
      { status: 500 }
    );
  }
}
