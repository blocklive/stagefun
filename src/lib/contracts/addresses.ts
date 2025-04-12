/**
 * Contract addresses for different networks
 * Update these addresses when deploying new contracts
 */
export const CONTRACT_ADDRESSES = {
  monadTestnet: {
    stageDotFunPoolFactory: "0x90cC6A1155839E867ADa7629b96e95647aE2395e",
    stageDotFunPoolImplementation: "0x9daCB929AAeB72Bc77205Dff8e312BC5daCF4eEe",
    stageDotFunLiquidityImplementation: "0xB728A0A43fF1768c296db49F14a14ece7A6E010a",
    stageDotFunNFTImplementation: "0x5600a394a4d5d0Fd9Fc7d5B89944d57969DEbDf9",
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
