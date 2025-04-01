/**
 * Consolidated configuration for contract deployment and network settings
 */

type ContractAddresses = {
  stageDotFunPoolFactory?: string;
  poolImplementation?: string;
  lpTokenImplementation?: string;
  nftImplementation?: string;
  [key: string]: string | undefined;
};

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
function getDeploymentNetworkConfig() {
  return NETWORK_CONFIG.monadTestnet;
}

// Helper to get contract addresses for current network
function getDeploymentContractAddresses() {
  return getDeploymentNetworkConfig().contracts;
}

// Helper to update contract addresses after deployment
function updateDeploymentContractAddresses(addresses: ContractAddresses) {
  const config = getDeploymentNetworkConfig();
  Object.assign(config.contracts, addresses);
  return config.contracts;
}

module.exports = {
  NETWORK_CONFIG,
  getCurrentNetworkConfig: getDeploymentNetworkConfig, // Export with original name for backward compatibility
  getContractAddresses: getDeploymentContractAddresses, // Export with original name for backward compatibility
  updateContractAddresses: updateDeploymentContractAddresses, // Export with original name for backward compatibility
};
