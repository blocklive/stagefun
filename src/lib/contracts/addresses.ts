/**
 * Contract addresses for different networks
 * Update these addresses when deploying new contracts
 */
export const CONTRACT_ADDRESSES = {
  monadTestnet: {
    stageDotFunPoolFactory: "0x67624eD3C9AC601cE41Da9468Dff919BD91C977F",
    stageDotFunPoolImplementation: "0x3Ed46120C8B1341E2828701151b57FCBCa179382",
    stageDotFunLiquidityImplementation: "0x6f55e9E0C5f76a2Fd6094EbAf134e653341ddD13",
    stageDotFunNFTImplementation: "0x329b3aE8f89782fEFaAd2C42B9C52844E9a609f8",
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
