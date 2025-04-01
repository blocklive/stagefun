/**
 * Contract addresses for different networks
 * Update these addresses when deploying new contracts
 */
export const CONTRACT_ADDRESSES = {
  monadTestnet: {
    stageDotFunPoolFactory: "0xfcfA32e85eA48127Ac63c90Ca33Da5F45B274BaD",
    stageDotFunPoolImplementation: "0xe7c98a6Ed66FFB1936612417239f878256C0D361",
    stageDotFunLiquidityImplementation: "0xF6734A29ade0AE4B7c93BF3f42BA7f6fD925bF75",
    stageDotFunNFTImplementation: "0x7E154eA144E179452cd75a14984AFc2300f95c88",
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
