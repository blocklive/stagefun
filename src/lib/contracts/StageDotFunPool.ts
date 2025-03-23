import { ethers } from "ethers";
import { POOL_ABI } from "../abi/pool-abi";
import { USDC_ABI } from "../abi/usdc-abi";
import { CONTRACT_ADDRESSES, getContractAddresses } from "./addresses";

// ABI for the StageDotFunPoolFactory contract
export const StageDotFunPoolFactoryABI = [
  // Events
  "event PoolCreated(address indexed pool, string name, string uniqueId, uint256 endTime, address depositToken, address owner, address creator, uint256 targetAmount, uint256 capAmount)",
  "event PoolStatusUpdated(address indexed poolAddress, uint8 status)",

  // View functions
  "function depositToken() view returns (address)",
  "function deployedPools(uint256) view returns (address)",
  "function getDeployedPools() view returns (address[])",
  "function getPoolCount() view returns (uint256)",
  "function predictPoolAddress(string uniqueId, uint256 timestamp) view returns (address)",
  "function getDeployedPoolsDetails(uint256 startIndex, uint256 endIndex) view returns (string[] names, string[] uniqueIds, address[] creators, uint256[] totalDeposits, uint256[] revenueAccumulated, uint256[] endTimes, uint256[] targetAmounts, uint256[] capAmounts, uint8[] statuses, address[] lpTokenAddresses, address[] nftContractAddresses, uint256[] tierCounts)",

  // State-changing functions
  "function createPool(string name, string uniqueId, string symbol, uint256 endTime, address owner, address creator, uint256 targetAmount, uint256 capAmount) external returns (address)",
  "function checkPoolStatus(address poolAddress) external",
  "function checkAllPoolsStatus() external",
];

// ABI for the StageDotFunPool contract
export const StageDotFunPoolABI = [
  // Events
  "event TierCreated(uint256 indexed tierId, string name, uint256 price)",
  "event TierUpdated(uint256 indexed tierId, string name, uint256 price)",
  "event TierDeactivated(uint256 indexed tierId)",
  "event TierActivated(uint256 indexed tierId)",
  "event RewardItemAdded(uint256 indexed tierId, string name, string itemType)",
  "event TierCommitted(address indexed user, uint256 indexed tierId, uint256 amount)",
  "event TargetReached(uint256 totalAmount)",
  "event CapReached(uint256 totalAmount)",
  "event FundsReturned(address indexed lp, uint256 amount)",
  "event PoolStatusUpdated(uint8 newStatus)",
  "event Deposit(address indexed lp, uint256 amount)",
  "event RevenueReceived(uint256 amount)",
  "event RevenueDistributed(uint256 amount)",
  "event PoolNameUpdated(string oldName, string newName)",
  "event NFTClaimed(address indexed user, uint256 indexed tierId, uint256 tokenId)",
  "event NFTsMintedForTier(uint256 indexed tierId, uint256 count)",
  "event LPTransfer(address indexed from, address indexed to, uint256 amount)",

  // View functions
  "function getPoolDetails() view returns (string _name, string _uniqueId, address _creator, uint256 _totalDeposits, uint256 _revenueAccumulated, uint256 _endTime, uint256 _targetAmount, uint256 _capAmount, uint8 _status, address _lpTokenAddress, address _nftContractAddress, uint256 _tierCount)",
  "function name() view returns (string)",
  "function uniqueId() view returns (string)",
  "function creator() view returns (address)",
  "function totalDeposits() view returns (uint256)",
  "function revenueAccumulated() view returns (uint256)",
  "function endTime() view returns (uint256)",
  "function targetAmount() view returns (uint256)",
  "function capAmount() view returns (uint256)",
  "function status() view returns (uint8)",
  "function targetReached() view returns (bool)",
  "function capReached() view returns (bool)",
  "function depositToken() view returns (address)",
  "function lpToken() view returns (address)",
  "function nftContract() view returns (address)",
  "function getTier(uint256 tierId) view returns (tuple(string name, uint256 price, bool isActive, string nftMetadata, bool isVariablePrice, uint256 minPrice, uint256 maxPrice, uint256 maxPatrons, uint256 currentPatrons))",
  "function getUserTierCommitments(address user) view returns (uint256[])",
  "function getTierCount() view returns (uint256)",
  "function getLpBalance(address holder) view returns (uint256)",
  "function getLpBalances(uint256 startIndex, uint256 endIndex) view returns (address[] holders, uint256[] balances)",
  "function getTierNFTSupply(uint256 tierId) view returns (uint256)",
  "function getLpHolders() view returns (address[])",

  // State-changing functions
  "function initialize(string _name, string _uniqueId, string symbol, uint256 _endTime, address _depositToken, address _owner, address _creator, uint256 _targetAmount, uint256 _capAmount, address _lpTokenImplementation, address _nftImplementation) external",
  "function createTier(string _name, uint256 _price, string _nftMetadata, bool _isVariablePrice, uint256 _minPrice, uint256 _maxPrice, uint256 _maxPatrons) external",
  "function updateTier(uint256 tierId, string _name, uint256 _price, string _nftMetadata, bool _isVariablePrice, uint256 _minPrice, uint256 _maxPrice, uint256 _maxPatrons) external",
  "function deactivateTier(uint256 tierId) external",
  "function activateTier(uint256 tierId) external",
  "function commitToTier(uint256 tierId, uint256 amount) external",
  "function receiveRevenue(uint256 amount) external",
  "function distributeRevenue() external",
  "function updatePoolName(string _newName) external",
  "function claimRefund() external",
  "function checkPoolStatus() external",
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
  capAmount: bigint;
  status: number;
  lpTokenAddress: string;
  nftContractAddress: string;
  tierCount: bigint;
}

// Get the factory contract instance
export function getStageDotFunPoolFactoryContract(
  signerOrProvider: ethers.Signer | ethers.Provider
) {
  const factoryAddress = CONTRACT_ADDRESSES.monadTestnet.stageDotFunPoolFactory;
  return new ethers.Contract(
    factoryAddress,
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
  name: string;
  uniqueId: string;
  creator: string;
  totalDeposits: bigint;
  revenueAccumulated: bigint;
  endTime: bigint;
  targetAmount: bigint;
  capAmount: bigint;
  status: number;
  lpTokenAddress: string;
  nftContractAddress: string;
  tierCount: bigint;
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
    names,
    uniqueIds,
    creators,
    totalDeposits,
    revenueAccumulated,
    endTimes,
    targetAmounts,
    capAmounts,
    statuses,
    lpTokenAddresses,
    nftContractAddresses,
    tierCounts,
  ] = await factory.getDeployedPoolsDetails(start, end);

  // Map the results to our PoolListItem interface
  const poolList: PoolListItem[] = [];

  for (let i = 0; i < names.length; i++) {
    poolList.push({
      name: names[i],
      uniqueId: uniqueIds[i],
      creator: creators[i],
      totalDeposits: totalDeposits[i],
      revenueAccumulated: revenueAccumulated[i],
      endTime: endTimes[i],
      targetAmount: targetAmounts[i],
      capAmount: capAmounts[i],
      status: statuses[i],
      lpTokenAddress: lpTokenAddresses[i],
      nftContractAddress: nftContractAddresses[i],
      tierCount: tierCounts[i],
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

    // Try to get the pool details - matches exactly with the ABI return values
    const details = await pool.getPoolDetails();

    return {
      name: details._name,
      uniqueId: details._uniqueId,
      creator: details._creator,
      totalDeposits: details._totalDeposits,
      revenueAccumulated: details._revenueAccumulated,
      endTime: details._endTime,
      targetAmount: details._targetAmount,
      capAmount: details._capAmount,
      status: details._status,
      lpTokenAddress: details._lpTokenAddress,
      nftContractAddress: details._nftContractAddress,
      tierCount: details._tierCount,
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
