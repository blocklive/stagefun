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
import { getRecommendedGasParams } from "../contracts/gas-utils";
import { CONTRACT_ADDRESSES } from "../contracts/StageDotFunPool";
import { StageDotFunPoolFactoryABI } from "../contracts/StageDotFunPool";

/**
 * Creates a pool in the smart contract
 * @param signer The signer to use for the transaction
 * @param name The name of the pool
 * @param uniqueId The unique ID of the pool
 * @param symbol The symbol of the pool
 * @param endTime The end time of the pool
 * @param targetAmount The target amount of the pool
 * @param capAmount The maximum amount that can be raised
 * @param tiers The tiers data for the pool
 * @returns The transaction receipt and pool ID
 */
export async function createPoolOnChain(
  signer: ethers.Signer,
  name: string,
  uniqueId: string,
  symbol: string,
  endTime: bigint,
  targetAmount: bigint,
  capAmount: bigint,
  tiers: {
    name: string;
    price: bigint;
    nftMetadata: string;
    isVariablePrice: boolean;
    minPrice: bigint;
    maxPrice: bigint;
    maxPatrons: bigint;
  }[]
): Promise<{
  receipt: ethers.TransactionReceipt;
  poolId: string;
  lpTokenAddress: string;
}> {
  const factory = getStageDotFunPoolFactoryContract(signer);
  const signerAddress = await signer.getAddress();

  // Create the transaction object with gas parameters
  const tx = await factory.createPool(
    name,
    uniqueId,
    symbol,
    endTime,
    signerAddress, // owner
    signerAddress, // creator
    targetAmount,
    capAmount,
    tiers,
    {
      ...getRecommendedGasParams(),
    }
  );

  const receipt = await tx.wait();

  // Get pool address from event
  const event = receipt.logs.find(
    (log: any) => log.fragment?.name === "PoolCreated"
  );
  if (!event) {
    throw new Error("PoolCreated event not found in transaction receipt");
  }

  // Get pool address from first argument
  const poolAddress = event.args[0];

  // Get pool contract to get LP token address
  const pool = new ethers.Contract(poolAddress, StageDotFunPoolABI, signer);
  const poolDetails = await pool.getPoolDetails();
  const lpTokenAddress = poolDetails[9]; // LP token address is the 10th return value from getPoolDetails()

  // Log the event data for debugging
  console.log("Pool creation details:", {
    poolAddress,
    lpTokenAddress,
    eventArgs: event.args,
  });

  return {
    receipt,
    poolId: poolAddress,
    lpTokenAddress,
  };
}

/**
 * Creates a pool using a smart wallet with paymaster for gas sponsorship
 * @param callContractFunction Function from SmartWallet hook to call contract functions
 * @param getProvider Function to get a provider for querying the blockchain
 * @param smartWalletAddress The address of the smart wallet
 * @param name The name of the pool
 * @param uniqueId The unique ID of the pool
 * @param symbol The symbol of the pool
 * @param endTime The end time of the pool
 * @param targetAmount The target amount of the pool
 * @param capAmount The maximum amount that can be raised
 * @param tiers The tiers data for the pool
 * @returns The transaction receipt, pool address and LP token address
 */
export async function createPoolWithSmartWallet(
  callContractFunction: (
    contractAddress: string,
    abi: any,
    functionName: string,
    args: any[],
    description: string
  ) => Promise<{ success: boolean; error?: string; txHash?: string }>,
  getProvider: () => Promise<ethers.Provider>,
  smartWalletAddress: string,
  name: string,
  uniqueId: string,
  symbol: string,
  endTime: bigint,
  targetAmount: bigint,
  capAmount: bigint,
  tiers: {
    name: string;
    price: bigint;
    nftMetadata: string;
    isVariablePrice: boolean;
    minPrice: bigint;
    maxPrice: bigint;
    maxPatrons: bigint;
  }[]
): Promise<{
  receipt: ethers.TransactionReceipt;
  poolAddress: string;
  lpTokenAddress: string;
  transactionHash: string;
}> {
  console.log(
    "Starting pool creation process with smart wallet for:",
    name,
    "uniqueId:",
    uniqueId,
    "symbol:",
    symbol,
    "endTime:",
    endTime,
    "targetAmount:",
    targetAmount,
    "capAmount:",
    capAmount,
    "tiers:",
    tiers.map((t) => ({
      ...t,
      price: t.price.toString(),
      minPrice: t.minPrice.toString(),
      maxPrice: t.maxPrice.toString(),
      maxPatrons: t.maxPatrons.toString(),
    }))
  );

  const factoryAddress = CONTRACT_ADDRESSES.monadTestnet
    .stageDotFunPoolFactory as `0x${string}`;

  // Set up arguments for the createPool function
  const args = [
    name,
    uniqueId,
    symbol,
    endTime,
    smartWalletAddress, // owner
    smartWalletAddress, // creator
    targetAmount,
    capAmount,
    tiers,
  ];

  // Call createPool on the factory contract using smart wallet
  const result = await callContractFunction(
    factoryAddress,
    StageDotFunPoolFactoryABI,
    "createPool",
    args,
    "Create New Funding Pool"
  );

  if (!result.success || !result.txHash) {
    throw new Error(result.error || "Failed to create pool");
  }

  console.log("Pool creation transaction sent:", result.txHash);

  // Get a provider to query the blockchain
  const provider = await getProvider();

  // Wait for transaction to be mined to get the receipt
  const receipt = await provider.waitForTransaction(result.txHash);
  console.log("Pool creation transaction confirmed:", receipt);

  if (!receipt) {
    throw new Error("Transaction failed");
  }

  // Find the PoolCreated event to get the pool address
  const iface = new ethers.Interface(StageDotFunPoolFactoryABI);
  let poolAddress = "";

  for (const log of receipt.logs) {
    try {
      const parsedLog = iface.parseLog({
        topics: log.topics as string[],
        data: log.data,
      });

      if (parsedLog?.name === "PoolCreated") {
        poolAddress = parsedLog.args[0];
        break;
      }
    } catch (e) {
      // Not the event we're looking for
      continue;
    }
  }

  if (!poolAddress) {
    throw new Error("Could not find pool address in transaction logs");
  }

  // Get LP token address by querying the pool contract
  console.log("Retrieving LP token address for pool:", poolAddress);
  const poolContract = new ethers.Contract(
    poolAddress,
    StageDotFunPoolABI,
    provider
  );

  // Call getPoolDetails() to get the LP token address
  const poolDetails = await poolContract.getPoolDetails();
  const lpTokenAddress = poolDetails[9]; // LP token address is the 10th return value (index 9)

  console.log("Pool creation completed successfully:", {
    poolAddress,
    lpTokenAddress,
    transactionHash: receipt.hash,
  });

  return {
    receipt,
    poolAddress,
    lpTokenAddress,
    transactionHash: receipt.hash,
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
  targetAmount: string;
  minCommitment: string;
  status: string;
  lpTokenAddress: string;
  lpHolders: string[];
  milestones: {
    description: string;
    amount: string;
    unlockTime: string;
    approved: boolean;
    released: boolean;
  }[];
  emergencyMode: boolean;
  emergencyWithdrawalRequestTime: string;
  authorizedWithdrawer: string;
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
        targetAmount: "0",
        minCommitment: "0",
        status: "0",
        lpTokenAddress: ethers.ZeroAddress,
        lpHolders: [],
        milestones: [],
        emergencyMode: false,
        emergencyWithdrawalRequestTime: "0",
        authorizedWithdrawer: ethers.ZeroAddress,
        exists: false,
      };
    }

    console.log("Pool address:", poolAddress);
    const details = await getPoolDetails(provider, poolAddress);
    console.log("Pool details:", details);

    return {
      name: details.name,
      totalDeposits: details.totalDeposits.toString(),
      revenueAccumulated: details.revenueAccumulated.toString(),
      endTime: details.endTime.toString(),
      targetAmount: details.targetAmount.toString(),
      minCommitment: details.minCommitment.toString(),
      status: details.status.toString(),
      lpTokenAddress: details.lpTokenAddress,
      lpHolders: details.lpHolders,
      milestones: details.milestones.map((milestone: any) => ({
        description: milestone.description,
        amount: milestone.amount.toString(),
        unlockTime: milestone.unlockTime.toString(),
        approved: milestone.approved !== undefined ? milestone.approved : false,
        released: milestone.released,
      })),
      emergencyMode: details.emergencyMode,
      emergencyWithdrawalRequestTime:
        details.emergencyWithdrawalRequestTime.toString(),
      authorizedWithdrawer: details.authorizedWithdrawer,
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

    const pool = getPoolContract(provider, poolAddress);
    const balance = await pool.getLpBalance(userAddress);
    return formatToken(balance);
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
