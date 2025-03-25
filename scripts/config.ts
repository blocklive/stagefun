/**
 * Consolidated configuration for contract deployment and network settings
 */

const NETWORK_CONFIG = {
  monadTestnet: {
    chainId: 10143,
    rpcUrl:
      "https://falling-practical-rain.monad-testnet.quiknode.pro/a5d256e0fcaf1ff2574b5d13322cb315b0cec88f",
    explorerUrl: "https://testnet.monadexplorer.com",
    contracts: {
      usdc: "0xf817257fed379853cDe0fa4F97AB987181B1E5Ea", // Monad testnet USDC
      stageDotFunPoolFactory: null, // Will be populated after deployment
      poolImplementation: null, // Will be populated after deployment
      lpTokenImplementation: null, // Will be populated after deployment
      nftImplementation: null, // Will be populated after deployment
    },
  },
};

// Helper to get the current network's configuration
export function getCurrentNetworkConfig() {
  return NETWORK_CONFIG.monadTestnet;
}

// Helper to get contract addresses for current network
export function getContractAddresses() {
  return getCurrentNetworkConfig().contracts;
}

// Helper to update contract addresses after deployment
export function updateContractAddresses(addresses: {
  stageDotFunPoolFactory?: string;
  poolImplementation?: string;
  lpTokenImplementation?: string;
  nftImplementation?: string;
}) {
  const config = getCurrentNetworkConfig();
  Object.assign(config.contracts, addresses);
  return config.contracts;
}

export { NETWORK_CONFIG };
