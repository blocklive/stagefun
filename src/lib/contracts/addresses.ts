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
    stageDotFunPoolFactory: "0x0eF5CBDBF207f27bC3Ffded0759fC05c6d8E2a9a",
    usdc: "0xf817257fed379853cDe0fa4F97AB987181B1E5Ea",
  },
} as const;

/**
 * Network configuration
 */
export const NETWORK = {
  chainId: 10143, // Monad Testnet
  rpcUrl: "https://falling-practical-rain.monad-testnet.quiknode.pro/a5d256e0fcaf1ff2574b5d13322cb315b0cec88f",
  explorerUrl: "https://testnet.monadexplorer.com",
} as const;

// Helper to get addresses for current network
export function getContractAddresses() {
  return CONTRACT_ADDRESSES.monadTestnet;
}
