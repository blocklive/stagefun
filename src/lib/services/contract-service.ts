import { ethers } from "ethers";
import {
  getPoolCommitmentContract,
  getUSDCContract,
  parseUSDC,
  formatUSDC,
  ContractPool,
  ContractCommitment,
  NETWORK_CONFIG,
} from "../contracts/PoolCommitment";

// Helper function to get a provider with Monad network
export function getMonadProvider() {
  return new ethers.JsonRpcProvider(NETWORK_CONFIG.rpcUrl);
}

// Helper function to get a signer with Monad network
export async function getMonadSigner(signer: ethers.Signer) {
  const provider = new ethers.JsonRpcProvider(NETWORK_CONFIG.rpcUrl);
  return await provider.getSigner();
}

/**
 * Creates a pool in the smart contract
 * @param signer The signer to use for the transaction
 * @param poolId The ID of the pool to create
 * @param targetAmount The target amount to raise in USDC
 * @returns The transaction receipt
 */
export async function createPoolOnChain(
  signer: ethers.Signer,
  poolId: string,
  targetAmount: number
): Promise<ethers.TransactionReceipt> {
  const contract = getPoolCommitmentContract(signer);
  const targetAmountWei = parseUSDC(targetAmount.toString());

  const tx = await contract.createPool(poolId, targetAmountWei, {
    gasLimit: 500000, // Adjust gas limit for Monad
  });
  return await tx.wait();
}

/**
 * Commits USDC to a pool
 * @param signer The signer to use for the transaction
 * @param poolId The ID of the pool to commit to
 * @param amount The amount to commit in USDC
 * @returns The transaction receipt
 */
export async function commitToPoolOnChain(
  signer: ethers.Signer,
  poolId: string,
  amount: number
): Promise<ethers.TransactionReceipt> {
  const poolContract = getPoolCommitmentContract(signer);
  const usdcContract = getUSDCContract(signer);
  const amountWei = parseUSDC(amount.toString());

  // First, approve the USDC transfer
  const approveTx = await usdcContract.approve(
    await poolContract.getAddress(),
    amountWei,
    {
      gasLimit: 100000, // Adjust gas limit for Monad
    }
  );
  await approveTx.wait();

  // Then commit to the pool
  const commitTx = await poolContract.commitToPool(poolId, amountWei, {
    gasLimit: 200000, // Adjust gas limit for Monad
  });
  return await commitTx.wait();
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
  const contract = getPoolCommitmentContract(provider);

  try {
    const pool = await contract.pools(poolId);
    return {
      id: pool.id,
      creator: pool.creator,
      targetAmount: pool.targetAmount,
      raisedAmount: pool.raisedAmount,
      active: pool.active,
    };
  } catch (error) {
    console.error("Error getting pool from chain:", error);
    return null;
  }
}

/**
 * Gets all commitments for a pool
 * @param provider The provider to use for the query
 * @param poolId The ID of the pool to get commitments for
 * @returns The commitments for the pool
 */
export async function getPoolCommitmentsFromChain(
  provider: ethers.Provider,
  poolId: string
): Promise<ContractCommitment[]> {
  const contract = getPoolCommitmentContract(provider);

  try {
    return await contract.getPoolCommitments(poolId);
  } catch (error) {
    console.error("Error getting pool commitments from chain:", error);
    return [];
  }
}

/**
 * Gets a user's commitment amount for a pool
 * @param provider The provider to use for the query
 * @param userAddress The address of the user
 * @param poolId The ID of the pool
 * @returns The user's commitment amount in USDC
 */
export async function getUserCommitmentFromChain(
  provider: ethers.Provider,
  userAddress: string,
  poolId: string
): Promise<string> {
  const contract = getPoolCommitmentContract(provider);

  try {
    const amount = await contract.getUserCommitment(userAddress, poolId);
    return formatUSDC(amount);
  } catch (error) {
    console.error("Error getting user commitment from chain:", error);
    return "0";
  }
}

/**
 * Gets the USDC balance of a user
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
    return formatUSDC(balance);
  } catch (error) {
    console.error("Error getting USDC balance:", error);
    return "0";
  }
}
