import useSWR from "swr";
import { Pool } from "../lib/supabase";
import { supabase } from "../lib/supabase";
import { ethers } from "ethers";
import { getPoolDetails } from "../lib/contracts/StageDotFunPool";

async function fetchPool(poolId: string) {
  // Get pool and patrons from database
  const [poolResult, patronsResult] = await Promise.all([
    supabase
      .from("pools")
      .select(
        `
        *,
        creator:creator_id (
          name,
          avatar_url
        )
      `
      )
      .eq("id", poolId)
      .single(),
    supabase.from("patrons").select("*").eq("pool_id", poolId),
  ]);

  if (poolResult.error) throw poolResult.error;
  if (!poolResult.data) return null;

  const dbPool = poolResult.data;
  const patrons = patronsResult.data || [];

  console.log("DB Pool data:", {
    id: dbPool.id,
    contract_address: dbPool.contract_address,
    target_amount: dbPool.target_amount,
  });

  console.log("Patrons data:", patrons);

  let chainData = {
    totalDeposits: BigInt(0),
    revenueAccumulated: BigInt(0),
    endTime: BigInt(0),
    status: 0,
  };

  // Only try to get blockchain data if we have a contract address
  if (dbPool.contract_address) {
    try {
      const provider = new ethers.JsonRpcProvider(
        process.env.NEXT_PUBLIC_BLOCKCHAIN_NETWORK === "monad"
          ? "https://testnet-rpc.monad.xyz"
          : "https://sepolia.base.org"
      );
      console.log(
        "Fetching blockchain data for contract:",
        dbPool.contract_address
      );
      const details = await getPoolDetails(provider, dbPool.contract_address);
      console.log("Raw blockchain data:", {
        totalDeposits: details.totalDeposits.toString(),
        revenueAccumulated: details.revenueAccumulated.toString(),
        endTime: details.endTime.toString(),
        status: details.status,
      });
      chainData = {
        totalDeposits: details.totalDeposits,
        revenueAccumulated: details.revenueAccumulated,
        endTime: details.endTime,
        status: details.status,
      };
    } catch (error) {
      console.error("Error fetching chain data:", error);
      // Continue with default values if blockchain fetch fails
    }
  } else {
    console.log("No contract address found for pool");
  }

  // Convert BigInt values to numbers and handle division by 1_000_000 for USDC amounts
  const totalDeposits = Number(chainData.totalDeposits) / 1_000_000;
  const revenueAccumulated = Number(chainData.revenueAccumulated) / 1_000_000;
  const target_amount = Number(dbPool.target_amount); // This is already in USDC (not base units)

  console.log("Processed amounts:", {
    totalDeposits,
    revenueAccumulated,
    target_amount,
  });

  // Calculate total patron commitments
  const patronCommitments = patrons.reduce(
    (sum, patron) => sum + Number(patron.amount),
    0
  );

  console.log("Total patron commitments:", patronCommitments);

  const pool = {
    ...dbPool,
    creator_name: dbPool.creator?.name || "Anonymous",
    creator_avatar_url: dbPool.creator?.avatar_url || null,
    target_amount,
    raised_amount: totalDeposits || patronCommitments || 0, // Use blockchain data or patron commitments
    revenue_accumulated: revenueAccumulated || 0,
    status: chainData.status === 1 ? "active" : "inactive",
    end_time: Number(chainData.endTime) || 0,
    patrons,
  };

  const percentage =
    target_amount > 0
      ? ((totalDeposits || patronCommitments) / target_amount) * 100
      : 0;

  console.log("Final pool data:", {
    target_amount,
    raised_amount: totalDeposits || patronCommitments,
    percentage,
  });

  return {
    pool,
    target_amount,
    raised_amount: totalDeposits || patronCommitments,
    percentage,
  };
}

export function usePool(poolId: string) {
  const { data, error, mutate } = useSWR(
    poolId ? ["pool", poolId] : null,
    ([_, id]) => fetchPool(id),
    {
      refreshInterval: 5000, // Refresh every 5 seconds to get latest blockchain data
      revalidateOnFocus: true,
      dedupingInterval: 2000,
      shouldRetryOnError: true,
      errorRetryCount: 3,
    }
  );

  return {
    pool: data?.pool,
    targetAmount: data?.target_amount ?? 0,
    raisedAmount: data?.raised_amount ?? 0,
    percentage: data?.percentage ?? 0,
    isLoading: !error && !data,
    isError: error,
    refresh: mutate,
  };
}
