import { ethers } from "ethers";
import { POOL_ABI } from "../abi/pool-abi";
import { USDC_ABI } from "../abi/usdc-abi";
import { CONTRACT_ADDRESSES, getContractAddresses } from "./addresses";

// ABI for the StageDotFunPoolFactory contract
export const StageDotFunPoolFactoryABI = [
  // Events
  "event PoolCreated(address indexed poolAddress, string name, address lpTokenAddress, uint256 endTime)",
  "event PoolStatusUpdated(address indexed poolAddress, uint8 status)",

  // View functions
  "function depositToken() view returns (address)",
  "function deployedPools(uint256) view returns (address)",
  "function getDeployedPools() view returns (address[])",
  "function getPoolCount() view returns (uint256)",
  "function getPoolByAddress(address poolAddress) view returns (address)",
  "function getPoolByName(string name) view returns (address)",

  // State-changing functions
  "function createPool(string name, string symbol, uint256 endTime, uint256 targetAmount, uint256 minCommitment) external returns (address)",
  "function updatePoolStatus(address poolAddress, uint8 status) external",
  "function deposit(string name, uint256 amount) external",
  "function withdraw(string name, uint256 amount) external",
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
  "function depositToken() view returns (address)",
  "function lpToken() view returns (address)",
  "function name() view returns (string)",
  "function totalDeposits() view returns (uint256)",
  "function revenueAccumulated() view returns (uint256)",
  "function endTime() view returns (uint256)",
  "function status() view returns (uint8)",
  "function lpBalances(address) view returns (uint256)",
  "function lpHolders(uint256) view returns (address)",
  "function isLpHolder(address) view returns (bool)",
  "function milestones(uint256) view returns (tuple(string description, uint256 amount, uint256 unlockTime, bool approved, bool released))",
  "function emergencyMode() view returns (bool)",
  "function emergencyWithdrawalRequestTime() view returns (uint256)",
  "function authorizedWithdrawer() view returns (address)",
  "function getLpHolders() view returns (address[])",
  "function getMilestones() view returns (tuple(string description, uint256 amount, uint256 unlockTime, bool approved, bool released)[])",
  "function getEmergencyStatus() view returns (bool isEmergency, uint256 withdrawalUnlockTime, bool canExecuteWithdrawal)",

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
  totalDeposits: bigint;
  revenueAccumulated: bigint;
  lpHolderCount: bigint;
  status: number;
  exists: boolean;
  lpTokenAddress: string;
  endTime: bigint;
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

// Get all deployed pools
export async function getDeployedPools(provider: ethers.Provider) {
  const factory = getStageDotFunPoolFactoryContract(provider);
  const poolAddresses = await factory.getDeployedPools();

  // Get pool details for each address
  const pools = await Promise.all(
    poolAddresses.map(async (address: string) => {
      const pool = getPoolContract(provider, address);
      const [
        name,
        totalDeposits,
        revenueAccumulated,
        endTime,
        status,
        lpTokenAddress,
      ] = await Promise.all([
        pool.name(),
        pool.totalDeposits(),
        pool.revenueAccumulated(),
        pool.endTime(),
        pool.status(),
        pool.lpToken(),
      ]);

      return {
        address,
        name,
        totalDeposits,
        revenueAccumulated,
        endTime,
        status,
        lpTokenAddress,
      };
    })
  );

  return pools;
}

// Create a new pool
export async function createPool(
  signer: ethers.Signer,
  name: string,
  symbol: string,
  endTime: bigint,
  targetAmount: bigint,
  minCommitment: bigint
) {
  const factory = getStageDotFunPoolFactoryContract(signer);

  // Create pool and wait for transaction
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
    poolAddress,
    lpTokenAddress,
    transactionHash: receipt.hash,
  };
}

// Get pool details
export async function getPoolDetails(
  provider: ethers.Provider,
  poolAddress: string
) {
  const pool = getPoolContract(provider, poolAddress);

  const [
    name,
    totalDeposits,
    revenueAccumulated,
    endTime,
    status,
    lpTokenAddress,
    lpHolders,
    milestones,
    emergencyStatus,
  ] = await Promise.all([
    pool.name(),
    pool.totalDeposits(),
    pool.revenueAccumulated(),
    pool.endTime(),
    pool.status(),
    pool.lpToken(),
    pool.getLpHolders(),
    pool.getMilestones(),
    pool.getEmergencyStatus(),
  ]);

  return {
    address: poolAddress,
    name,
    totalDeposits,
    revenueAccumulated,
    endTime,
    status,
    lpTokenAddress,
    lpHolders,
    milestones,
    emergencyStatus,
  };
}

// Make a deposit to a pool through the factory
export async function depositToPool(
  signer: ethers.Signer,
  poolName: string,
  amount: bigint
) {
  const factory = getStageDotFunPoolFactoryContract(signer);
  const tx = await factory.deposit(poolName, amount);
  return tx.wait();
}

// Withdraw from a pool through the factory
export async function withdrawFromPool(
  signer: ethers.Signer,
  poolName: string,
  amount: bigint
) {
  const factory = getStageDotFunPoolFactoryContract(signer);
  const tx = await factory.withdraw(poolName, amount);
  return tx.wait();
}

// Update pool status through the factory
export async function updatePoolStatus(
  signer: ethers.Signer,
  poolAddress: string,
  status: number
) {
  const factory = getStageDotFunPoolFactoryContract(signer);
  const tx = await factory.updatePoolStatus(poolAddress, status);
  return tx.wait();
}

// Get pool by name
export async function getPoolByName(
  provider: ethers.Provider,
  name: string
): Promise<string | null> {
  const factory = getStageDotFunPoolFactoryContract(provider);
  try {
    return await factory.getPoolByName(name);
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

// Helper function to format token amounts (6 decimals for USDC)
export function formatToken(amount: bigint): string {
  return ethers.formatUnits(amount, 6);
}

// Helper function to parse token amounts (6 decimals for USDC)
export function parseToken(amount: string): bigint {
  return ethers.parseUnits(amount, 6);
}

// Helper function to get pool ID from name
export function getPoolId(name: string): string {
  return ethers.keccak256(ethers.toUtf8Bytes(name));
}
