/**
 * Contract addresses for different networks
 * Update these addresses when deploying new contracts
 */
export const CONTRACT_ADDRESSES = {
  monadTestnet: {
    stageDotFunPoolFactory: "0x427EBBb75c87C2BD85143c0575768479e0EC5Ca1",
    poolImplementation: "0xc32C337be453BF3ca693a84fb7Eb288A23e82C98",
    lpTokenImplementation: "0x8C5bc6392498756f6F691E02ab1854E2F3850253",
    nftImplementation: "0xe97d3c253fc7a0BbEe6527D03bE8860Bb10c1f6E",
    usdc: "0xf817257fed379853cDe0fa4F97AB987181B1E5Ea",
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
