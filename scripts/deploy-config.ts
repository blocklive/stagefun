/**
 * Deployment configuration
 * These values are used during contract deployment and will be written to addresses.ts
 */
export const DEPLOY_CONFIG = {
  // Network configuration
  network: {
    chainId: 10143, // Monad Testnet
    rpcUrl: "https://testnet-rpc.monad.xyz",
    explorerUrl: "https://testnet.monadexplorer.com",
  },

  // Contract addresses - will be updated during deployment
  contracts: {
    usdc: "0xf817257fed379853cDe0fa4F97AB987181B1E5Ea", // Monad testnet USDC
    stageDotFunPool: "", // Will be set during deployment
  },
} as const;
