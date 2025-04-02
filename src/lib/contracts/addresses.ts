/**
 * Contract addresses for different networks
 * Update these addresses when deploying new contracts
 */
export const CONTRACT_ADDRESSES = {
  monadTestnet: {
    stageDotFunPoolFactory: "0x24ec1a5BaD13cb96562D6D37dE3f753e3C1aC099",
    stageDotFunPoolImplementation: "0x2a6cA8A5941a8Fe2D8cdbe6C0f649Ef5dFdE74Fd",
    stageDotFunLiquidityImplementation: "0x6EB0Cf7fA6aD1fc62A97DaA86F17c193997cB5F3",
    stageDotFunNFTImplementation: "0x6b68e6F76542BD7A6E81B69Ea3E3076A31Eb265c",
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
