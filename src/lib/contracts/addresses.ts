/**
 * Contract addresses for different networks
 * Update these addresses when deploying new contracts
 */
export const CONTRACT_ADDRESSES = {
  monadTestnet: {
    stageDotFunPoolFactory: "0x7a6635F8196D4f20178629d749E8b6046f032CD8",
    stageDotFunPoolImplementation: "0x56b144CB2845c118682EdC0408F0F29BBdcEc624",
    stageDotFunLiquidityImplementation:
      "0x63CBE730914F4dF2b7220B0b604A1674874b36c8",
    stageDotFunNFTImplementation: "0x0855Ef96d5499222f716EaBc922015Cf68592599",
    usdc: "0xf817257fed379853cDe0fa4F97AB987181B1E5Ea",
    stageSwapFactory: "0xeE4aE2939Be69568d755900034A43a7c0C3Bd40D",
    stageSwapRouter: "0x3DC7C1091D28196c345354412516DB741D63Bb51",
    weth: "0x7e99081B0D97231BC2036F88970b248dDb8D9017",
  },
} as const;

/**
 * Network configuration
 */
export const NETWORK = {
  chainId: 10143,
  rpcUrl:
    "https://falling-practical-rain.monad-testnet.quiknode.pro/a5d256e0fcaf1ff2574b5d13322cb315b0cec88f",
  explorerUrl: "https://testnet.monadexplorer.com",
} as const;

// Helper to get addresses for current network
export function getContractAddresses() {
  return CONTRACT_ADDRESSES.monadTestnet;
}
