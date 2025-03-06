import { ethers } from "ethers";
import {
  getStageDotFunPoolContract,
  getUSDCContract,
  parseToken,
  formatToken,
  ContractPool,
  getPoolId,
  CONTRACT_ADDRESSES,
  getStageDotFunLiquidityContract,
} from "../contracts/StageDotFunPool";
import { supabase } from "../supabase";
import { POOL_ABI } from "../abi/pool-abi";

/**
 * Creates a pool in the smart contract
 * @param signer The signer to use for the transaction
 * @param name The name of the pool
 * @param symbol The symbol of the pool
 * @param endTime The end time of the pool
 * @returns The transaction receipt and pool ID
 */
export async function createPoolOnChain(
  signer: ethers.Signer,
  name: string,
  symbol: string,
  endTime: number
): Promise<{ receipt: ethers.TransactionReceipt; poolId: string }> {
  const contract = getStageDotFunPoolContract(signer);
  const poolId = getPoolId(name);

  const tx = await contract.createPool(name, symbol, endTime);
  const receipt = await tx.wait();

  // Get the LP token address from the PoolCreated event
  const poolCreatedEvent = receipt.logs.find(
    (log: any) => log.eventName === "PoolCreated"
  );
  if (!poolCreatedEvent) {
    throw new Error("PoolCreated event not found");
  }

  return {
    receipt,
    poolId,
  };
}

/**
 * Deposits USDC to a pool
 * @param signer The signer to use for the transaction
 * @param poolId The ID of the pool to deposit to
 * @param amount The amount to deposit in USDC
 * @returns The transaction receipt
 */
export async function depositToPoolOnChain(
  signer: ethers.Signer,
  poolId: string,
  amount: number
): Promise<{
  approvalTx: ethers.TransactionReceipt | null;
  depositTx: ethers.TransactionReceipt;
}> {
  try {
    const signerAddress = await signer.getAddress();
    console.log("Using signer address:", signerAddress);

    // Get the pool name from the database
    const { data: pool } = await supabase
      .from("pools")
      .select("name")
      .eq("id", poolId)
      .single();

    if (!pool) {
      throw new Error("Pool not found");
    }

    // Create contracts with explicit provider configuration
    const poolContract = getStageDotFunPoolContract(signer);
    const usdcContract = getUSDCContract(signer);
    const amountBigInt = parseToken(amount.toString());

    // Generate the correct pool ID from the pool name
    const bytes32PoolId = getPoolId(pool.name);
    console.log("Using pool name:", pool.name);
    console.log("Generated poolId:", bytes32PoolId);

    // Check allowance
    console.log("Checking USDC allowance");
    const currentAllowance = await usdcContract.allowance(
      signerAddress,
      CONTRACT_ADDRESSES.stageDotFunPool
    );
    console.log("Current allowance:", currentAllowance.toString());

    let approvalReceipt: ethers.TransactionReceipt | null = null;

    // Handle approval if needed
    if (currentAllowance < amountBigInt) {
      console.log("Approving USDC transfer");
      const approveTx = await usdcContract.approve(
        CONTRACT_ADDRESSES.stageDotFunPool,
        amountBigInt,
        {
          gasLimit: 100000,
        }
      );
      approvalReceipt = await approveTx.wait();
      console.log("Approval confirmed in block:", approvalReceipt?.blockNumber);
    }

    // Execute deposit
    console.log("Executing pool deposit with params:", {
      bytes32PoolId,
      amountBigInt: amountBigInt.toString(),
      poolContract: poolContract.target,
    });

    // Get the pool status first
    const poolInfo = await poolContract.getPool(bytes32PoolId);
    console.log("Pool status:", poolInfo.status);

    const depositTx = await poolContract.deposit(bytes32PoolId, amountBigInt, {
      gasLimit: 300000, // Increased gas limit
    });
    console.log("Deposit transaction sent:", depositTx.hash);

    const depositReceipt = await depositTx.wait();
    console.log("Deposit confirmed in block:", depositReceipt.blockNumber);

    return {
      approvalTx: approvalReceipt,
      depositTx: depositReceipt,
    };
  } catch (error) {
    console.error("Error in depositToPoolOnChain:", error);
    if (error instanceof Error) {
      throw new Error(`Transaction failed: ${error.message}`);
    }
    throw new Error("Transaction failed with unknown error");
  }
}

/**
 * Gets a pool from the smart contract
 * @param provider The provider to use for the query
 * @param poolId The ID of the pool to get
 * @returns The pool data
 */
export async function getPoolFromChain(
  provider: ethers.Provider,
  poolId: string
): Promise<ContractPool | null> {
  const contract = getStageDotFunPoolContract(provider);

  try {
    const pool = await contract.getPool(poolId);
    return {
      name: pool.name,
      totalDeposits: pool.totalDeposits,
      revenueAccumulated: pool.revenueAccumulated,
      lpHolderCount: pool.lpHolderCount,
      status: pool.status,
      exists: pool.exists,
      lpTokenAddress: pool.lpTokenAddress,
      endTime: pool.endTime,
    };
  } catch (error) {
    console.error("Error getting pool from chain:", error);
    return null;
  }
}

/**
 * Gets all LP token holders for a pool
 * @param provider The provider to use for the query
 * @param poolId The ID of the pool to get holders for
 * @returns The LP token holders
 */
export async function getPoolLpHoldersFromChain(
  provider: ethers.Provider,
  poolId: string
): Promise<string[]> {
  const contract = getStageDotFunPoolContract(provider);

  try {
    return await contract.getPoolLpHolders(poolId);
  } catch (error) {
    console.error("Error getting pool LP holders from chain:", error);
    return [];
  }
}

/**
 * Gets a user's LP token balance for a pool
 * @param provider The provider to use for the query
 * @param userAddress The address of the user
 * @param poolId The ID of the pool
 * @returns The user's LP token balance
 */
export async function getUserPoolBalanceFromChain(
  provider: ethers.Provider,
  userAddress: string,
  poolId: string
): Promise<string> {
  const contract = getStageDotFunPoolContract(provider);

  try {
    const amount = await contract.getPoolBalance(poolId, userAddress);
    return formatToken(amount);
  } catch (error) {
    console.error("Error getting user pool balance from chain:", error);
    return "0";
  }
}

/**
 * Gets a user's USDC balance
 * @param provider The provider to use for the query
 * @param userAddress The address of the user
 * @returns The user's USDC balance
 */
export async function getUSDCBalance(
  provider: ethers.Provider,
  userAddress: string
): Promise<string> {
  const contract = getUSDCContract(provider);

  try {
    const balance = await contract.balanceOf(userAddress);
    return formatToken(balance);
  } catch (error) {
    console.error("Error getting USDC balance:", error);
    return "0";
  }
}

/**
 * Gets the symbol of an LP token
 * @param provider The provider to use for the query
 * @param lpTokenAddress The address of the LP token contract
 * @returns The token symbol
 */
export async function getLPTokenSymbol(
  provider: ethers.Provider,
  lpTokenAddress: string
): Promise<string> {
  const contract = getStageDotFunLiquidityContract(provider, lpTokenAddress);

  try {
    return await contract.symbol();
  } catch (error) {
    console.error("Error getting LP token symbol:", error);
    return "";
  }
}

/**
 * Activates a pool in the smart contract
 * @param signer The signer to use for the transaction
 * @param poolId The ID of the pool to activate
 * @returns The transaction receipt
 */
export async function activatePoolOnChain(
  signer: ethers.Signer,
  poolId: string
): Promise<ethers.TransactionReceipt> {
  const contract = getStageDotFunPoolContract(signer);

  try {
    // Get the pool name from the database
    const { data: pool } = await supabase
      .from("pools")
      .select("name")
      .eq("id", poolId)
      .single();

    if (!pool) {
      throw new Error("Pool not found");
    }

    // Generate the correct pool ID from the pool name
    const bytes32PoolId = getPoolId(pool.name);
    console.log("Activating pool:", pool.name);
    console.log("Pool ID:", bytes32PoolId);

    // Call updatePoolStatus with PoolStatus.ACTIVE (1)
    const tx = await contract.updatePoolStatus(bytes32PoolId, 1);
    const receipt = await tx.wait();
    console.log("Pool activated in block:", receipt.blockNumber);

    return receipt;
  } catch (error) {
    console.error("Error activating pool:", error);
    if (error instanceof Error) {
      throw new Error(`Failed to activate pool: ${error.message}`);
    }
    throw new Error("Failed to activate pool with unknown error");
  }
}

export function getPoolContract(provider: ethers.Provider, address: string) {
  return new ethers.Contract(address, POOL_ABI, provider);
}
