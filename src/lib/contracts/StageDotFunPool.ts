import { ethers } from "ethers";
import { POOL_ABI } from "../abi/pool-abi";
import { USDC_ABI } from "../abi/usdc-abi";
import { CONTRACT_ADDRESSES, getContractAddresses } from "./addresses";

// ABI for the StageDotFunPoolFactory contract
export const StageDotFunPoolFactoryABI = [
  // Events
  "event PoolCreated(address indexed poolAddress, string name, string uniqueId, address creator, address lpTokenAddress, uint256 endTime)",
  "event PoolStatusUpdated(address indexed poolAddress, uint8 status)",

  // View functions
  "function depositToken() view returns (address)",
  "function deployedPools(uint256) view returns (address)",
  "function getDeployedPools() view returns (address[])",
  "function getPoolCount() view returns (uint256)",
  "function getPoolByAddress(address poolAddress) view returns (address)",
  "function getDeployedPoolsDetails(uint256 startIndex, uint256 endIndex) view returns (address[] poolAddresses, string[] names, string[] uniqueIds, address[] creators, uint256[] totalDeposits, uint256[] revenueAccumulated, uint256[] endTimes, uint256[] targetAmounts, uint8[] statuses)",

  // State-changing functions
  "function createPool(string name, string uniqueId, string symbol, uint256 endTime, uint256 targetAmount, uint256 minCommitment) external returns (address)",
  "function updatePoolStatus(address poolAddress, uint8 status) external",
];

// ABI for the StageDotFunPool contract
export const StageDotFunPoolABI = [
  // Events
  "event Deposit(address indexed lp, uint256 amount)",
  "event Withdraw(address indexed lp, uint256 amount)",
  "event RevenueReceived(uint256 amount)",
  "event RevenueDistributed(uint256 amount)",
  "event MilestoneCreated(uint256 indexed milestoneIndex, string description, uint256 amount, uint256 unlockTime)",
  "event MilestoneApproved(uint256 indexed milestoneIndex)",
  "event MilestoneWithdrawn(uint256 indexed milestoneIndex, uint256 amount)",
  "event EmergencyModeEnabled()",
  "event EmergencyWithdrawalRequested(uint256 unlockTime)",
  "event EmergencyWithdrawalExecuted(uint256 amount)",
  "event WithdrawerAuthorized(address withdrawer)",
  "event WithdrawerRevoked(address withdrawer)",

  // View functions
  "function getPoolDetails() view returns (string _name, string _uniqueId, address _creator, uint256 _totalDeposits, uint256 _revenueAccumulated, uint256 _endTime, uint256 _targetAmount, uint256 _minCommitment, uint8 _status, address _lpTokenAddress, address[] memory _lpHolders, tuple(string description, uint256 amount, uint256 unlockTime, bool approved, bool released)[] memory _milestones, bool _emergencyMode, uint256 _emergencyWithdrawalRequestTime, address _authorizedWithdrawer)",
  "function getLpBalance(address holder) view returns (uint256)",
  "function getLpBalances(uint256 startIndex, uint256 endIndex) view returns (address[] memory holders, uint256[] memory balances)",
  "function depositToken() view returns (address)",
  "function lpToken() view returns (address)",
  "function deposit(uint256 amount) returns ()",
  "function name() view returns (string)",
  "function uniqueId() view returns (string)",
  "function creator() view returns (address)",
  "function totalDeposits() view returns (uint256)",
  "function revenueAccumulated() view returns (uint256)",
  "function endTime() view returns (uint256)",
  "function targetAmount() view returns (uint256)",
  "function minCommitment() view returns (uint256)",
  "function status() view returns (uint8)",
  "function lpBalances(address) view returns (uint256)",
  "function lpHolders(uint256) view returns (address)",
  "function isLpHolder(address) view returns (bool)",
  "function milestones(uint256) view returns (tuple(string description, uint256 amount, uint256 unlockTime, bool approved, bool released))",
  "function emergencyMode() view returns (bool)",
  "function emergencyWithdrawalRequestTime() view returns (uint256)",
  "function authorizedWithdrawer() view returns (address)",

  // State-changing functions
  "function deposit(uint256 amount) external",
  "function withdraw(uint256 amount) external",
  "function receiveRevenue(uint256 amount) external",
  "function distributeRevenue() external",
  "function setMilestones(string[] calldata descriptions, uint256[] calldata amounts, uint256[] calldata unlockTimes) external",
  "function approveMilestone(uint256 milestoneIndex) external",
  "function withdrawMilestone(uint256 milestoneIndex) external",
  "function setAuthorizedWithdrawer(address withdrawer) external",
  "function revokeAuthorizedWithdrawer() external",
  "function enableEmergencyMode() external",
  "function requestEmergencyWithdrawal() external",
  "function executeEmergencyWithdrawal() external",
  "function updateStatus(uint8 newStatus) external",
];

// ABI for the StageDotFunLiquidity token
export const StageDotFunLiquidityABI = [
  // Events
  "event Transfer(address indexed from, address indexed to, uint256 value)",
  "event Approval(address indexed owner, address indexed spender, uint256 value)",

  // View functions
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
  "function totalSupply() view returns (uint256)",
  "function balanceOf(address owner) view returns (uint256)",
  "function allowance(address owner, address spender) view returns (uint256)",

  // State-changing functions
  "function transfer(address to, uint256 value) returns (bool)",
  "function approve(address spender, uint256 value) returns (bool)",
  "function transferFrom(address from, address to, uint256 value) returns (bool)",
];

// ABI for ERC20 tokens (USDC)
export const ERC20_ABI = [
  // Events
  "event Transfer(address indexed from, address indexed to, uint256 value)",
  "event Approval(address indexed owner, address indexed spender, uint256 value)",

  // View functions
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
  "function totalSupply() view returns (uint256)",
  "function balanceOf(address owner) view returns (uint256)",
  "function allowance(address owner, address spender) view returns (uint256)",

  // State-changing functions
  "function transfer(address to, uint256 value) returns (bool)",
  "function approve(address spender, uint256 value) returns (bool)",
  "function transferFrom(address from, address to, uint256 value) returns (bool)",
];

// Export contract addresses and helper functions for use in other files
export { CONTRACT_ADDRESSES, getContractAddresses };

// Pool type matching the contract
export interface ContractPool {
  name: string;
  uniqueId: string;
  creator: string;
  totalDeposits: bigint;
  revenueAccumulated: bigint;
  endTime: bigint;
  targetAmount: bigint;
  minCommitment: bigint;
  status: number;
  lpTokenAddress: string;
  lpHolders: string[];
  milestones: {
    description: string;
    amount: bigint;
    unlockTime: bigint;
    approved: boolean;
    released: boolean;
  }[];
  emergencyMode: boolean;
  emergencyWithdrawalRequestTime: bigint;
  authorizedWithdrawer: string;
}

// Get the factory contract instance
export function getStageDotFunPoolFactoryContract(
  signerOrProvider: ethers.Signer | ethers.Provider
) {
  return new ethers.Contract(
    getContractAddresses().stageDotFunPoolFactory,
    StageDotFunPoolFactoryABI,
    signerOrProvider
  );
}

// Get a specific pool contract instance
export function getPoolContract(
  signerOrProvider: ethers.Signer | ethers.Provider,
  poolAddress: string
) {
  return new ethers.Contract(poolAddress, StageDotFunPoolABI, signerOrProvider);
}

// Define a type for the pool list item
export interface PoolListItem {
  address: string;
  name: string;
  uniqueId: string;
  creator: string;
  totalDeposits: bigint;
  revenueAccumulated: bigint;
  endTime: bigint;
  targetAmount: bigint;
  status: number;
}

// Get all deployed pools with pagination support
export async function getDeployedPoolsDetails(
  provider: ethers.Provider,
  startIndex?: number,
  endIndex?: number
): Promise<PoolListItem[]> {
  const factory = getStageDotFunPoolFactoryContract(provider);

  // If no indices provided, pass 0,0 to get all pools
  const start = startIndex ?? 0;
  const end = endIndex ?? 0;

  const [
    poolAddresses,
    names,
    uniqueIds,
    creators,
    totalDeposits,
    revenueAccumulated,
    endTimes,
    targetAmounts,
    statuses,
  ] = await factory.getDeployedPoolsDetails(start, end);

  // Map the results to our PoolListItem interface
  const poolList: PoolListItem[] = [];

  for (let i = 0; i < poolAddresses.length; i++) {
    poolList.push({
      address: poolAddresses[i],
      name: names[i],
      uniqueId: uniqueIds[i],
      creator: creators[i],
      totalDeposits: totalDeposits[i],
      revenueAccumulated: revenueAccumulated[i],
      endTime: endTimes[i],
      targetAmount: targetAmounts[i],
      status: statuses[i],
    });
  }

  return poolList;
}

// Get all deployed pools (original function for backward compatibility)
export async function getDeployedPools(provider: ethers.Provider) {
  const factory = getStageDotFunPoolFactoryContract(provider);
  const poolAddresses = await factory.getDeployedPools();

  // Get pool details for each address
  const pools = await Promise.all(
    poolAddresses.map(async (address: string) => {
      return await getPoolDetails(provider, address);
    })
  );

  return pools;
}

// Create a new pool
export async function createPool(
  signer: ethers.Signer,
  name: string,
  uniqueId: string,
  symbol: string,
  endTime: bigint,
  targetAmount: bigint,
  minCommitment: bigint
) {
  const factory = getStageDotFunPoolFactoryContract(signer);

  try {
    const tx = await factory.createPool(
      name,
      uniqueId,
      symbol,
      endTime,
      targetAmount,
      minCommitment
    );
    const receipt = await tx.wait();

    // Find the PoolCreated event in the receipt
    const event = receipt.logs
      .map((log: any) => {
        try {
          return factory.interface.parseLog({
            topics: log.topics as string[],
            data: log.data,
          });
        } catch (e) {
          return null;
        }
      })
      .find((event: any) => event && event.name === "PoolCreated");

    if (event) {
      return {
        poolAddress: event.args.poolAddress,
        name: event.args.name,
        uniqueId: event.args.uniqueId,
        creator: event.args.creator,
        lpTokenAddress: event.args.lpTokenAddress,
        endTime: event.args.endTime,
      };
    }

    return null;
  } catch (error) {
    console.error("Error creating pool:", error);
    throw error;
  }
}

// Get pool details
export async function getPoolDetails(
  provider: ethers.Provider,
  poolAddress: string
): Promise<ContractPool> {
  if (!poolAddress || poolAddress === ethers.ZeroAddress) {
    throw new Error("Pool not found");
  }

  const pool = getPoolContract(provider, poolAddress);

  try {
    // First check if the contract exists at this address
    const code = await provider.getCode(poolAddress);
    if (code === "0x") {
      console.error(`No contract found at address: ${poolAddress}`);
      throw new Error("Contract not found at specified address");
    }

    // Try to get the pool details
    const details = await pool.getPoolDetails();

    return {
      name: details[0],
      uniqueId: details[1],
      creator: details[2],
      totalDeposits: details[3],
      revenueAccumulated: details[4],
      endTime: details[5],
      targetAmount: details[6],
      minCommitment: details[7],
      status: details[8],
      lpTokenAddress: details[9],
      lpHolders: details[10],
      milestones: details[11],
      emergencyMode: details[12],
      emergencyWithdrawalRequestTime: details[13],
      authorizedWithdrawer: details[14],
    };
  } catch (error) {
    console.error(`Error getting pool details for ${poolAddress}:`, error);

    // Add more detailed error information
    if (error instanceof Error) {
      if (error.message.includes("call revert exception")) {
        console.error(
          "Contract call reverted. This could mean the contract doesn't have the expected interface."
        );
      } else if (error.message.includes("network error")) {
        console.error(
          "Network error occurred. This could mean the RPC endpoint is down or unreachable."
        );
      }
    }

    throw error;
  }
}

// Get pool by name
export async function getPoolByName(
  provider: ethers.Provider,
  name: string
): Promise<string | null> {
  const factory = getStageDotFunPoolFactoryContract(provider);
  try {
    const pools = await factory.getDeployedPools();

    // Check each pool's name
    for (const poolAddress of pools) {
      const pool = getPoolContract(provider, poolAddress);
      const poolName = await pool.name();
      if (poolName === name) {
        return poolAddress;
      }
    }

    return null;
  } catch (error) {
    console.error("Error getting pool by name:", error);
    return null;
  }
}

// Get pool by address
export async function getPoolByAddress(
  provider: ethers.Provider,
  address: string
): Promise<string | null> {
  const factory = getStageDotFunPoolFactoryContract(provider);
  try {
    return await factory.getPoolByAddress(address);
  } catch (error) {
    console.error("Error getting pool by address:", error);
    return null;
  }
}

export function getStageDotFunLiquidityContract(
  provider: ethers.Provider | ethers.Signer,
  address: string
) {
  return new ethers.Contract(address, StageDotFunLiquidityABI, provider);
}

// Get the USDC contract instance
export function getUSDCContract(
  signerOrProvider: ethers.Signer | ethers.Provider
) {
  return new ethers.Contract(
    getContractAddresses().usdc,
    USDC_ABI,
    signerOrProvider
  );
}

// USDC has 6 decimal places
export const USDC_DECIMALS = 6;
export const USDC_DECIMAL_FACTOR = 10 ** USDC_DECIMALS;

// Convert from USDC base units to display units
export function fromUSDCBaseUnits(amount: bigint): number {
  return Number(amount) / USDC_DECIMAL_FACTOR;
}

// Convert from display units to USDC base units
export function toUSDCBaseUnits(amount: number): bigint {
  return BigInt(Math.round(amount * USDC_DECIMAL_FACTOR));
}

// Format token amount for display
export function formatToken(amount: bigint): string {
  return (Number(amount) / USDC_DECIMAL_FACTOR).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

// Parse token amount from string
export function parseToken(amount: string): bigint {
  return BigInt(Math.round(parseFloat(amount) * USDC_DECIMAL_FACTOR));
}

// Helper function to get pool ID from name
export function getPoolId(name: string): string {
  return ethers.keccak256(ethers.toUtf8Bytes(name));
}

// Define a type for the LP holder item
export interface LpHolderItem {
  address: string;
  balance: bigint;
}

// Get LP holders with pagination support
export async function getLpHoldersWithBalances(
  provider: ethers.Provider,
  poolAddress: string,
  startIndex?: number,
  endIndex?: number
): Promise<LpHolderItem[]> {
  const poolContract = getPoolContract(provider, poolAddress);

  // If no indices provided, pass 0,0 to get all holders
  const start = startIndex ?? 0;
  const end = endIndex ?? 0;

  const [holders, balances] = await poolContract.getLpBalances(start, end);

  // Map the results to our LpHolderItem interface
  const lpHolders: LpHolderItem[] = [];

  for (let i = 0; i < holders.length; i++) {
    lpHolders.push({
      address: holders[i],
      balance: balances[i],
    });
  }

  return lpHolders;
}
