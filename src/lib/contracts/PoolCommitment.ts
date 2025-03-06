import { ethers } from "ethers";

// ABI for the PoolCommitment contract
export const PoolCommitmentABI = [
  // Events
  "event PoolCreated(string poolId, address creator, uint256 targetAmount)",
  "event CommitmentMade(string poolId, address user, uint256 amount)",
  "event CommitmentVerified(string poolId, address user)",
  "event FundsWithdrawn(string poolId, address recipient, uint256 amount)",

  // View functions
  "function pools(string) view returns (string id, address creator, uint256 targetAmount, uint256 raisedAmount, bool active)",
  "function getPoolCommitments(string) view returns (tuple(address user, uint256 amount, bool verified)[])",
  "function getUserCommitment(address, string) view returns (uint256)",
  "function usdcToken() view returns (address)",

  // State-changing functions
  "function createPool(string, uint256) external",
  "function commitToPool(string, uint256) external",
  "function verifyCommitment(string, uint256) external",
  "function withdrawFunds(string) external",
  "function updateUsdcToken(address) external",
];

// Full ERC20 ABI for USDC
export const USDC_ABI = [
  // Read-only functions
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

  // Events
  "event Transfer(address indexed from, address indexed to, uint256 value)",
  "event Approval(address indexed owner, address indexed spender, uint256 value)",
];

// Contract addresses (to be updated after deployment)
export const CONTRACT_ADDRESSES = {
  // Default to test addresses, will be updated with environment variables
  poolCommitment:
    process.env.NEXT_PUBLIC_POOL_CONTRACT_ADDRESS ||
    "0x0000000000000000000000000000000000000000",
  usdc:
    process.env.NEXT_PUBLIC_USDC_ADDRESS ||
    "0xf817257fed379853cDe0fa4F97AB987181B1E5Ea", // Monad testnet USDC
};

// Pool type matching the contract
export interface ContractPool {
  id: string;
  creator: string;
  targetAmount: bigint;
  raisedAmount: bigint;
  active: boolean;
}

// Commitment type matching the contract
export interface ContractCommitment {
  user: string;
  amount: bigint;
  verified: boolean;
}

// Helper function to get contract instances
export function getPoolCommitmentContract(
  provider: ethers.Provider | ethers.Signer
) {
  return new ethers.Contract(
    CONTRACT_ADDRESSES.poolCommitment,
    PoolCommitmentABI,
    provider
  );
}

export function getUSDCContract(provider: ethers.Provider | ethers.Signer) {
  console.log("Getting USDC contract at address:", CONTRACT_ADDRESSES.usdc);
  console.log("Using provider:", {
    type: provider.constructor.name,
    isProvider: "provider" in provider,
  });
  const contract = new ethers.Contract(
    CONTRACT_ADDRESSES.usdc,
    USDC_ABI,
    provider
  );
  console.log("USDC contract created successfully");
  return contract;
}

// Helper function to format USDC amounts (6 decimals)
export function formatUSDC(amount: bigint): string {
  return ethers.formatUnits(amount, 6);
}

// Helper function to parse USDC amounts (6 decimals)
export function parseUSDC(amount: string): bigint {
  return ethers.parseUnits(amount, 6);
}
