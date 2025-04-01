/**
 * Contract addresses for different networks
 * Update these addresses when deploying new contracts
 */
export const CONTRACT_ADDRESSES = {
  monadTestnet: {
    stageDotFunPoolFactory: "0x0A3cB40Cb868871F1ebDB69F34a3551a5A4bD46a",
    stageDotFunPoolImplementation: "0x9009A500AE81FF61dE6F765a1D3FF7707a8eC80c",
    stageDotFunLiquidityImplementation: "0x1df9a5A68D48FCC86f23Dec8D5338964530CaCdd",
    stageDotFunNFTImplementation: "0xD0Ff4507b50d884fC1C2379b91EaCEE918Ab7fE0",
    usdc: "0xf817257fed379853cDe0fa4F97AB987181B1E5Ea",
  },
} as const;

/**
 * Network configuration
 */
export const NETWORK = {
  chainId: 10143,
  rpcUrl: "https://falling-practical-rain.monad-testnet.quiknode.pro/a5d256e0fcaf1ff2574b5d13322cb315b0cec88f",
  explorerUrl: "https://testnet.monadexplorer.com",
} as const;

// Helper to get addresses for current network
export function getContractAddresses() {
  return CONTRACT_ADDRESSES.monadTestnet;
}
