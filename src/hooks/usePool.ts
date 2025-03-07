import useSWR from "swr";
import { Pool } from "../lib/supabase";
import { supabase } from "../lib/supabase";
import { ethers } from "ethers";
import {
  getPoolDetails,
  getPoolContract,
} from "../lib/contracts/StageDotFunPool";

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

  let chainData = {
    totalDeposits: BigInt(0),
    revenueAccumulated: BigInt(0),
    endTime: BigInt(0),
    status: 0,
  };

  let details = null;

  // Only try to get blockchain data if we have a contract address
  if (dbPool.contract_address) {
    try {
      const provider = new ethers.JsonRpcProvider(
        process.env.NEXT_PUBLIC_BLOCKCHAIN_NETWORK === "monad"
          ? "https://testnet-rpc.monad.xyz"
          : "https://sepolia.base.org"
      );

      // First verify the contract exists and is accessible
      const code = await provider.getCode(dbPool.contract_address);
      if (code === "0x") {
        console.error(
          "Contract not found at address:",
          dbPool.contract_address,
          "This could mean the contract is not deployed or the address is incorrect"
        );
        throw new Error("Contract not found at specified address");
      }

      details = await getPoolDetails(provider, dbPool.contract_address);
      chainData = {
        totalDeposits: details.totalDeposits,
        revenueAccumulated: details.revenueAccumulated,
        endTime: details.endTime,
        status: details.status,
      };
    } catch (error: any) {
      // Enhanced error logging
      console.error("Error fetching chain data:", {
        error: error.message,
        code: error.code,
        method: error.method,
        transaction: error.transaction,
        pool_id: dbPool.id,
        contract_address: dbPool.contract_address,
        network: process.env.NEXT_PUBLIC_BLOCKCHAIN_NETWORK,
        stack: error.stack, // Add stack trace
      });

      if (error.code === "CALL_EXCEPTION") {
        console.error(
          "Contract call failed. This could mean the contract doesn't have the expected interface or the function reverted.",
          "Function signature:",
          error.transaction?.data
        );
      } else if (error.code === "NETWORK_ERROR") {
        console.error(
          "Network error occurred. This could mean the RPC endpoint is down or unreachable."
        );
      }
      // Continue with default values if blockchain fetch fails
    }
  } else {
    console.log("No contract address found for pool");
  }

  // Convert BigInt values to numbers and handle division by 1_000_000 for USDC amounts
  const totalDeposits = Number(chainData.totalDeposits) / 1_000_000;
  const revenueAccumulated = Number(chainData.revenueAccumulated) / 1_000_000;
  const target_amount = Number(dbPool.target_amount); // This is already in USDC (not base units)

  // Calculate total patron commitments
  const patronCommitments = patrons.reduce(
    (sum, patron) => sum + Number(patron.amount),
    0
  );

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
    milestones: details?.milestones || [],
    emergency_mode: details?.emergencyMode || false,
    emergency_withdrawal_request_time:
      details?.emergencyWithdrawalRequestTime || BigInt(0),
    authorized_withdrawer: details?.authorizedWithdrawer || ethers.ZeroAddress,
  };

  const percentage =
    target_amount > 0
      ? ((totalDeposits || patronCommitments) / target_amount) * 100
      : 0;

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
