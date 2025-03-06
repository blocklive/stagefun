/**
 * Contract addresses for different networks
 * Update these addresses when deploying new contracts
 */
export const CONTRACT_ADDRESSES = {
  baseSepolia: {
    stageDotFunPoolFactory: "0x...", // We'll fill this after deployment
    usdc: "0xf817257fed379853cDe0fa4F97AB987181B1E5Ea",
  },
  monadTestnet: {
    stageDotFunPoolFactory: "0x918A0aA3b103b39D9Bc2c643Fd706E8b36757BC9",
    usdc: "0xf817257fed379853cDe0fa4F97AB987181B1E5Ea",
  },
} as const;

/**
 * Network configuration
 */
export const NETWORK = {
  chainId: 10143, // Monad Testnet
  rpcUrl: "https://testnet-rpc.monad.xyz",
  explorerUrl: "https://testnet.monadexplorer.com",
} as const;

// Helper to get addresses for current network
export function getContractAddresses() {
  return CONTRACT_ADDRESSES.monadTestnet;
}
