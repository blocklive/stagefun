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
    stageSwapFactory: "0xB6162CcC7E84C18D605c6DFb4c337227C6dC5dF7",
    stageSwapRouter: "0x4B883edfd434d74eBE82FE6dB5f058e6fF08cD53",
    weth: "0x760AfE86e5de5fa0Ee542fc7B7B713e1c5425701",
    officialWmon: "0x760AfE86e5de5fa0Ee542fc7B7B713e1c5425701",
    // Proper token addresses from CORE_TOKENS
    aprmon: "0xb2f82D0f38dc453D596Ad40A37799446Cc89274A", // apMON token
    shmon: "0x3a98250F98Dd388C211206983453837C8365BDc1", // ShMON token
    gmon: "0xaEef2f6B429Cb59C9B2D7bB2141ADa993E8571c3", // gMON token
    // Other Core tokens
    weth_token: "0xB5a30b0FDc5EA94A52fDc42e3E9760Cb8449Fb37", // WETH token
    chog: "0xE0590015A873bF326bd645c3E1266d4db41C4E6B", // CHOG token
    moyaki: "0xfe140e1dCe99Be9F4F15d657CD9b7BF622270C50", // MOYAKI token
    mlndk: "0x0F0BDEbF0F83cD1EE3974779Bcb7315f9808c714", // MOLANDAK token
    ksmon: "0xe1d2439b75fb9746E7Bc6cB777Ae10AA7f7ef9c5", // ksMON token
    usdt: "0x88b8E2161DEDC77EF4ab7585569D2415a1C1055D", // USDT token
    wbtc: "0xcf5a6076cfa32686c0Df13aBaDa2b40dec133F1d", // WBTC token
    fmon: "0x89e4a70de5F2Ae468B18B6B6300B249387f9Adf0", // FMON token
    jerry: "0xda054a96254776346386060c480b42a10c870cd2",
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
