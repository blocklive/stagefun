/**
 * Contract addresses for different networks
 * Update these addresses when deploying new contracts
 */
export const CONTRACT_ADDRESSES = {
  monadTestnet: {
    stageDotFunPoolFactory: "0x68965BebA7357C4f224eE9D4e85721d2FAF27aeB",
    stageDotFunPoolImplementation: "0xcE410075C805e81558376b082DFDdCcC2986F313",
    stageDotFunLiquidityImplementation: "0xdd6d5bB97cD195335eaB08Ee95f133776A131A8E",
    stageDotFunNFTImplementation: "0x9876e7a435a4DD38d0dFd07f20A384967cE22747",
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
