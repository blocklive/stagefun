import { NextRequest, NextResponse } from "next/server";
import { ethers } from "ethers";
import { AMM_CONTRACTS } from "@/lib/services/blockchain/amm-events.service";
import { getEthersProvider } from "@/lib/services/blockchain/queries.service";
import { getSupabaseAdmin } from "@/lib/services/supabase-admin";
import {
  startBlockchainSyncRun,
  completeBlockchainSyncRun,
} from "@/lib/services/blockchain/sync-tracking.service";

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
      message: "AMM pairs discovery completed",
      summary: {
        factoryAddress: AMM_CONTRACTS.FACTORY,
        totalPairsInFactory: totalPairs.toString(),
        processed: processedCount,
        upsertedPairs: upsertedPairsCount,
        errors: errorCount,
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
