import { ethers } from "ethers";

// ABI for the StageDotFunPool contract
export const StageDotFunPoolABI = [
  // Events
  "event PoolCreated(bytes32 indexed poolId, string name, address lpTokenAddress)",
  "event PoolStatusUpdated(bytes32 indexed poolId, uint8 status)",
  "event Deposit(bytes32 indexed poolId, address indexed lp, uint256 amount)",
  "event RevenueReceived(bytes32 indexed poolId, uint256 amount)",
  "event RevenueDistributed(bytes32 indexed poolId, uint256 amount)",

  // View functions
  "function pools(bytes32) view returns (string name, uint256 totalDeposits, uint256 revenueAccumulated, uint256 lpHolderCount, uint8 status, bool exists, address lpTokenAddress)",
  "function getPool(bytes32) view returns (tuple(string name, uint256 totalDeposits, uint256 revenueAccumulated, uint256 lpHolderCount, uint8 status, bool exists, address lpTokenAddress))",
  "function getPoolLpHolders(bytes32) view returns (address[])",
  "function getPoolBalance(bytes32, address) view returns (uint256)",
  "function depositToken() view returns (address)",

  // State-changing functions
  "function createPool(string) external",
  "function deposit(bytes32, uint256) external",
  "function receiveRevenue(bytes32, uint256) external",
  "function distributeRevenue(bytes32) external",
  "function updatePoolStatus(bytes32, uint8) external",
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

// Contract addresses (to be updated after deployment)
export const CONTRACT_ADDRESSES = {
  // Default to test addresses, will be updated with environment variables
  stageDotFunPool:
    process.env.NEXT_PUBLIC_POOL_COMMITMENT_ADDRESS ||
    "0x0000000000000000000000000000000000000000",
  usdc:
    process.env.NEXT_PUBLIC_USDC_ADDRESS ||
    "0xf817257fed379853cDe0fa4F97AB987181B1E5Ea", // Monad testnet USDC
};

// Pool type matching the contract
export interface ContractPool {
  name: string;
  totalDeposits: bigint;
  revenueAccumulated: bigint;
  lpHolderCount: bigint;
  status: number;
  exists: boolean;
  lpTokenAddress: string;
}

// Helper function to get contract instances
export function getStageDotFunPoolContract(
  provider: ethers.Provider | ethers.Signer
) {
  return new ethers.Contract(
    CONTRACT_ADDRESSES.stageDotFunPool,
    StageDotFunPoolABI,
    provider
  );
}

export function getStageDotFunLiquidityContract(
  provider: ethers.Provider | ethers.Signer,
  address: string
) {
  return new ethers.Contract(address, StageDotFunLiquidityABI, provider);
}

export function getUSDCContract(provider: ethers.Provider | ethers.Signer) {
  return new ethers.Contract(
    CONTRACT_ADDRESSES.usdc,
    StageDotFunLiquidityABI, // USDC uses the same ABI as our LP token
    provider
  );
}

// Helper function to format token amounts (18 decimals)
export function formatToken(amount: bigint): string {
  return ethers.formatUnits(amount, 18);
}

// Helper function to parse token amounts (18 decimals)
export function parseToken(amount: string): bigint {
  return ethers.parseUnits(amount, 18);
}

// Helper function to get pool ID from name
export function getPoolId(name: string): string {
  return ethers.keccak256(ethers.toUtf8Bytes(name));
}
