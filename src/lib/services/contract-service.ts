import { ethers } from "ethers";
import {
  getStageDotFunPoolFactoryContract,
  getPoolContract as getPoolContractInstance,
  getUSDCContract,
  formatToken,
  parseToken,
  getPoolId,
  getPoolDetails,
  getPoolByName,
} from "../contracts/StageDotFunPool";
import { supabase } from "../supabase";
import { POOL_ABI } from "../abi/pool-abi";
import { StageDotFunPoolABI } from "../contracts/StageDotFunPool";

/**
 * Creates a pool in the smart contract
 * @param signer The signer to use for the transaction
 * @param name The name of the pool
 * @param symbol The symbol of the pool
 * @param endTime The end time of the pool
 * @param targetAmount The target amount of the pool
 * @param minCommitment The minimum commitment of the pool
 * @returns The transaction receipt and pool ID
 */
export async function createPoolOnChain(
  signer: ethers.Signer,
  name: string,
  symbol: string,
  endTime: bigint,
  targetAmount: bigint,
  minCommitment: bigint
): Promise<{
  receipt: ethers.TransactionReceipt;
  poolId: string;
  lpTokenAddress: string;
}> {
  const factory = getStageDotFunPoolFactoryContract(signer);
  const tx = await factory.createPool(
    name,
    symbol,
    endTime,
    targetAmount,
    minCommitment
  );
  const receipt = await tx.wait();

  // Get pool address from event
  const event = receipt.logs.find(
    (log: any) => log.eventName === "PoolCreated"
  );
  const poolAddress = event.args.poolAddress;
  const lpTokenAddress = event.args.lpTokenAddress;

  return {
    receipt,
    poolId: poolAddress,
    lpTokenAddress,
  };
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
): Promise<{
  name: string;
  totalDeposits: string;
  revenueAccumulated: string;
  endTime: string;
  status: string;
  lpTokenAddress: string;
  exists: boolean;
}> {
  try {
    const poolAddress = await getPoolByName(provider, poolId);

    if (!poolAddress) {
      return {
        name: "",
        totalDeposits: "0",
        revenueAccumulated: "0",
        endTime: "0",
        status: "0",
        lpTokenAddress: ethers.ZeroAddress,
        exists: false,
      };
    }

    console.log("Pool address:", poolAddress);
    const details = await getPoolDetails(provider, poolAddress);
    console.log("Pool details:", details);

    return {
      name: details._name,
      totalDeposits: details._totalDeposits.toString(),
      revenueAccumulated: details._revenueAccumulated.toString(),
      endTime: details._endTime.toString(),
      status: details._status.toString(),
      lpTokenAddress: details._lpTokenAddress,
      exists: true,
    };
  } catch (error) {
    console.error("Error getting pool from chain:", error);
    throw error;
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
  try {
    const poolAddress = await getPoolByName(provider, poolId);

    if (!poolAddress) {
      return [];
    }

    const details = await getPoolDetails(provider, poolAddress);
    return details.lpHolders;
  } catch (error) {
    console.error("Error getting LP holders from chain:", error);
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
  try {
    const poolAddress = await getPoolByName(provider, poolId);

    if (!poolAddress) {
      return "0";
    }

    const details = await getPoolDetails(provider, poolAddress);
    const deposit = details.deposits.find(
      (d) => d.address.toLowerCase() === userAddress.toLowerCase()
    );
    return formatToken(deposit?.amount || BigInt(0));
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
  const usdcContract = getUSDCContract(provider);
  const balance = await usdcContract.balanceOf(userAddress);
  return formatToken(balance);
}

/**
 * Gets the symbol of an LP token
 * @param provider The provider to use for the query
 * @param poolAddress The address of the pool
 * @returns The token symbol
 */
export async function getLPTokenSymbol(
  provider: ethers.Provider,
  poolAddress: string
): Promise<string> {
  try {
    const details = await getPoolDetails(provider, poolAddress);
    const lpTokenAddress = details.lpTokenAddress;

    if (!lpTokenAddress || lpTokenAddress === ethers.ZeroAddress) {
      return "Not deployed";
    }

    const lpToken = new ethers.Contract(
      lpTokenAddress,
      ["function symbol() view returns (string)"],
      provider
    );

    return await lpToken.symbol();
  } catch (error) {
    console.error("Error fetching LP token symbol:", error);
    return "Not deployed";
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
  const factory = getStageDotFunPoolFactoryContract(signer);
  const poolAddress = await factory.getPoolByName(poolId);

  if (!poolAddress) {
    throw new Error("Pool not found");
  }

  const tx = await factory.updatePoolStatus(poolAddress, 1); // 1 = active
  return tx.wait();
}

/**
 * Deactivates a pool in the smart contract
 * @param signer The signer to use for the transaction
 * @param poolId The ID of the pool to deactivate
 * @returns The transaction receipt
 */
export async function deactivatePoolOnChain(
  signer: ethers.Signer,
  poolId: string
): Promise<ethers.TransactionReceipt> {
  const factory = getStageDotFunPoolFactoryContract(signer);
  const poolAddress = await factory.getPoolByName(poolId);

  if (!poolAddress) {
    throw new Error("Pool not found");
  }

  const tx = await factory.updatePoolStatus(poolAddress, 0); // 0 = inactive
  return tx.wait();
}

export function getPoolContract(provider: ethers.Provider, address: string) {
  return new ethers.Contract(address, StageDotFunPoolABI, provider);
}
