/**
 * Contract addresses for different networks
 * Update these addresses when deploying new contracts
 */
export const CONTRACT_ADDRESSES = {
  monadTestnet: {
    stageDotFunPoolFactory: "0x91aa6A9C4B1070c2C3CF2a33FC13821E51E0BA57",
    stageDotFunPoolImplementation: "0xa20546E6D53B9A8DdcCAC69caE5bBaA9b46847D3",
    stageDotFunLiquidityImplementation: "0xb8147a097E5e4D065f47FE5135FCd576c72DE58b",
    stageDotFunNFTImplementation: "0xDADE1322dF03B09a385544Ff1d60520AC15eE6F3",
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
