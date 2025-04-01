/**
 * Contract addresses for different networks
 * Update these addresses when deploying new contracts
 */
export const CONTRACT_ADDRESSES = {
  monadTestnet: {
    stageDotFunPoolFactory: "0x7aec322d87d87a2add4189b915ab5706f83E56E4",
    stageDotFunPoolImplementation: "0xE3f45B38e969C8b612E14E5a2dfB78A9caa8dAf4",
    stageDotFunLiquidityImplementation: "0x59DeB13883E43884a2686de27f8Bb8f1145fd6C1",
    stageDotFunNFTImplementation: "0xCbcc9bd4B30fC5562b2f1b4160B4d2C5D444832C",
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
