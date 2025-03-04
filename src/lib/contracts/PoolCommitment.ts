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

// USDC ABI (simplified for our needs)
export const USDC_ABI = [
  "function approve(address spender, uint256 amount) external returns (bool)",
  "function allowance(address owner, address spender) external view returns (uint256)",
  "function balanceOf(address account) external view returns (uint256)",
  "function transfer(address recipient, uint256 amount) external returns (bool)",
  "function transferFrom(address sender, address recipient, uint256 amount) external returns (bool)",
];

// Contract addresses (to be updated after deployment)
export const CONTRACT_ADDRESSES = {
  // Default to Monad testnet addresses
  poolCommitment:
    process.env.NEXT_PUBLIC_POOL_COMMITMENT_ADDRESS ||
    "0x0000000000000000000000000000000000000000", // Update this with your deployed contract address
  usdc:
    process.env.NEXT_PUBLIC_USDC_ADDRESS ||
    "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238", // Monad testnet USDC address
};

// Network configuration
export const NETWORK_CONFIG = {
  chainId: 10143, // Monad testnet chain ID
  name: "Monad Testnet",
  rpcUrl: "https://testnet-rpc.monad.xyz",
  explorerUrl: "https://testnet.monadexplorer.com",
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
  return new ethers.Contract(CONTRACT_ADDRESSES.usdc, USDC_ABI, provider);
}

// Helper function to format USDC amounts (6 decimals)
export function formatUSDC(amount: bigint): string {
  return ethers.formatUnits(amount, 6);
}

// Helper function to parse USDC amounts (6 decimals)
export function parseUSDC(amount: string): bigint {
  return ethers.parseUnits(amount, 6);
}
