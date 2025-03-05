import { ethers } from "ethers";
import {
  getPoolFactoryContract,
  getUSDCContract,
  parseUSDC,
  formatUSDC,
  CONTRACT_ADDRESSES,
  StageDotFunPoolABI,
} from "../contracts/StageDotFunPool";

export interface PoolInfo {
  id: string;
  targetAmount: BigNumber;
  totalDeposits: BigNumber;
  lpTokenAddress: string;
  status: number;
}

/**
 * Creates a pool in the factory contract
 * @param signer The signer to use for the transaction
 * @param name The name of the pool
 * @returns The transaction receipt and pool ID
 */
export async function createPoolOnChain(
  signer: ethers.Signer,
  name: string
): Promise<{
  receipt: ethers.TransactionReceipt;
  poolId: string;
  lpTokenAddress: string;
}> {
  const contract = getPoolFactoryContract(signer);

  // Create the pool
  console.log("Creating pool with name:", name);
  const tx = await contract.createPool(name);
  const receipt = await tx.wait();

  // Get the pool ID and LP token address from the event
  const event = receipt?.logs
    .map((log) => {
      try {
        return contract.interface.parseLog({
          topics: [...log.topics],
          data: log.data,
        });
      } catch {
        return null;
      }
    })
    .find((event) => event?.name === "PoolCreated");

  if (!event) {
    throw new Error("Pool creation event not found");
  }

  const poolId = event.args[0]; // bytes32 poolId
  const lpTokenAddress = event.args[2]; // address lpTokenAddress
  console.log("Pool created with ID:", poolId);
  console.log("LP token deployed at:", lpTokenAddress);

  return { receipt, poolId, lpTokenAddress };
}

/**
 * Deposits USDC into a pool and receives LP tokens
 * @param signer The signer to use for the transaction
 * @param poolId The ID of the pool
 * @param amount The amount to deposit in USDC
 * @returns The transaction receipts for approval and deposit
 */
export async function depositToPoolOnChain(
  signer: ethers.Signer,
  poolId: string,
  amount: number
): Promise<{ receipt: ContractReceipt; lpTokenAddress: string }> {
  try {
    console.log(`Depositing ${amount} USDC to pool ${poolId}`);

    // Get pool factory contract
    const poolFactory = new ethers.Contract(
      POOL_FACTORY_ADDRESS,
      POOL_FACTORY_ABI,
      signer
    );

    // Get USDC contract
    const usdcContract = new ethers.Contract(USDC_ADDRESS, ERC20_ABI, signer);

    // Get pool info to verify it exists and get LP token
    const poolInfo: PoolInfo = await poolFactory.getPool(poolId);
    if (!poolInfo.lpTokenAddress) {
      throw new Error("Pool not found or LP token not deployed");
    }

    const signerAddress = await signer.getAddress();
    const amountInWei = ethers.utils.parseUnits(amount.toString(), 6); // USDC has 6 decimals

    // Check USDC allowance
    const allowance = await usdcContract.allowance(
      signerAddress,
      POOL_FACTORY_ADDRESS
    );
    if (allowance.lt(amountInWei)) {
      console.log("Approving USDC spend...");
      const approveTx = await usdcContract.approve(
        POOL_FACTORY_ADDRESS,
        amountInWei
      );
      await approveTx.wait();
    }

    // Execute deposit
    console.log("Executing deposit transaction...");
    const tx = await poolFactory.deposit(poolId, amountInWei);
    const receipt = await tx.wait();

    console.log("Deposit successful:", receipt.transactionHash);
    return { receipt, lpTokenAddress: poolInfo.lpTokenAddress };
  } catch (error) {
    console.error("Error in depositToPoolOnChain:", error);
    throw error;
  }
}

/**
 * Gets pool information from the chain
 * @param provider The provider to use for the query
 * @param poolId The ID of the pool
 * @returns The pool information
 */
export async function getPoolFromChain(
  provider: ethers.Provider,
  poolId: string
): Promise<PoolInfo | null> {
  const contract = getPoolFactoryContract(provider);

  try {
    return await contract.getPool(poolId);
  } catch (error) {
    console.error("Error getting pool from chain:", error);
    return null;
  }
}

/**
 * Gets all pools from the chain
 * @param provider The provider to use for the query
 * @returns Array of pool information
 */
export async function getAllPoolsFromChain(
  provider: ethers.Provider
): Promise<PoolInfo[]> {
  const contract = getPoolFactoryContract(provider);

  try {
    return await contract.getPools();
  } catch (error) {
    console.error("Error getting all pools from chain:", error);
    return [];
  }
}

/**
 * Gets the pool ID for a given name
 * @param provider The provider to use for the query
 * @param name The name of the pool
 * @returns The pool ID
 */
export async function getPoolIdFromName(
  provider: ethers.Provider,
  name: string
): Promise<string> {
  const contract = getPoolFactoryContract(provider);
  return await contract.getPoolId(name);
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
  if (!userAddress) {
    console.log("No address provided for balance check");
    return "0";
  }

  try {
    console.log("Getting USDC balance for:", userAddress);
    const contract = getUSDCContract(provider);
    const balance = await contract.balanceOf(userAddress);
    const formatted = formatUSDC(balance);
    console.log("Balance:", formatted, "USDC");
    return formatted;
  } catch (error) {
    console.error("Error getting USDC balance:", error);
    return "0";
  }
}
