/**
 * Contract addresses for different networks
 * Update these addresses when deploying new contracts
 */
export const CONTRACT_ADDRESSES = {
  monadTestnet: {
    stageDotFunPoolFactory: "0x7a6635F8196D4f20178629d749E8b6046f032CD8",
    stageDotFunPoolImplementation: "0x56b144CB2845c118682EdC0408F0F29BBdcEc624",
    stageDotFunLiquidityImplementation: "0x63CBE730914F4dF2b7220B0b604A1674874b36c8",
    stageDotFunNFTImplementation: "0x0855Ef96d5499222f716EaBc922015Cf68592599",
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
