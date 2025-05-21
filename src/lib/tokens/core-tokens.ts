import { CONTRACT_ADDRESSES } from "@/lib/contracts/addresses";
import { Token } from "@/types/token";

// Define and export the SwapToken interface
export interface SwapToken {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  logoURI: string;
  isCustom?: boolean;
  isVerified?: boolean;
}

// Core tokens that are always available
export const CORE_TOKENS: Token[] = [
  {
    address: "NATIVE", // Special marker for native MON
    symbol: "MON",
    name: "Monad",
    decimals: 18,
    logoURI: "/icons/mon-logo.svg",
    source: "core",
    hasLiquidity: true, // Core tokens always have liquidity
    isVerified: true, // Native token is always verified
  },
  {
    address: CONTRACT_ADDRESSES.monadTestnet.usdc,
    symbol: "USDC",
    name: "USD Coin",
    decimals: 6,
    logoURI: "/icons/usdc-logo.svg",
    source: "core",
    hasLiquidity: true, // Core tokens always have liquidity
    isVerified: true, // Mark as officially verified token
  },
  {
    address: CONTRACT_ADDRESSES.monadTestnet.officialWmon, // Official WMON address
    symbol: "WMON",
    name: "Wrapped MON",
    decimals: 18,
    logoURI: "/icons/mon-logo.svg",
    source: "core",
    hasLiquidity: true, // Core tokens always have liquidity
    isVerified: true, // This is the official WMON token
  },
  {
    address: CONTRACT_ADDRESSES.monadTestnet.weth_token,
    symbol: "WETH",
    name: "Wrapped Ether",
    decimals: 18,
    logoURI: "/icons/weth-logo.png",
    source: "core",
    hasLiquidity: true,
    isVerified: true,
  },
  {
    address: CONTRACT_ADDRESSES.monadTestnet.aprmon,
    symbol: "aprMON",
    name: "aPriori Monad LST",
    decimals: 18,
    logoURI: "/icons/aprmon-logo.svg",
    source: "core",
    hasLiquidity: true,
    isVerified: true,
  },
  {
    address: CONTRACT_ADDRESSES.monadTestnet.chog,
    symbol: "CHOG",
    name: "Chog",
    decimals: 18,
    logoURI: "/icons/chog-logo.png",
    source: "core",
    hasLiquidity: true,
    isVerified: true,
  },
  {
    address: CONTRACT_ADDRESSES.monadTestnet.moyaki,
    symbol: "YAKI",
    name: "Moyaki",
    decimals: 18,
    logoURI: "/icons/moyaki-logo.png",
    source: "core",
    hasLiquidity: true,
    isVerified: true,
  },
  {
    address: CONTRACT_ADDRESSES.monadTestnet.mlndk,
    symbol: "DAK",
    name: "Molandak",
    decimals: 18,
    logoURI: "/icons/molandak-logo.png",
    source: "core",
    hasLiquidity: true,
    isVerified: true,
  },
  {
    address: CONTRACT_ADDRESSES.monadTestnet.gmon,
    symbol: "gMON",
    name: "gMON",
    decimals: 18,
    logoURI: "/icons/gmon-logo.png",
    source: "core",
    hasLiquidity: true,
    isVerified: true,
  },
  {
    address: CONTRACT_ADDRESSES.monadTestnet.shmon,
    symbol: "ShMON",
    name: "ShMonad",
    decimals: 18,
    logoURI: "/icons/shmon-logo.png",
    source: "core",
    hasLiquidity: true,
    isVerified: true,
  },
  {
    address: CONTRACT_ADDRESSES.monadTestnet.ksmon,
    symbol: "sMON",
    name: "Kintsu Staked Monad",
    decimals: 18,
    logoURI: "/icons/kintsu-staked-mon-logo.png",
    source: "core",
    hasLiquidity: true,
    isVerified: true,
  },
  {
    address: CONTRACT_ADDRESSES.monadTestnet.usdt,
    symbol: "USDT",
    name: "Tether USD",
    decimals: 6,
    logoURI: "/icons/tether-logo.png",
    source: "core",
    hasLiquidity: true,
    isVerified: true,
  },
  {
    address: CONTRACT_ADDRESSES.monadTestnet.wbtc,
    symbol: "WBTC",
    name: "Wrapped Bitcoin",
    decimals: 8,
    logoURI: "/icons/wbtc-icon.svg",
    source: "core",
    hasLiquidity: true,
    isVerified: true,
  },
  {
    address: CONTRACT_ADDRESSES.monadTestnet.fmon,
    symbol: "FMON",
    name: "Fantasy MON",
    decimals: 18,
    logoURI: "/icons/mon-logo.svg",
    source: "core",
    hasLiquidity: true,
    isVerified: true,
  },
];

// Export helper function to get the swappable subset of core tokens
export const getSwapCoreTokens = (): SwapToken[] => {
  return [
    // USDC should be first for swap interface
    CORE_TOKENS.find((token) => token.symbol === "USDC"),
    // MON (native) should be second
    CORE_TOKENS.find(
      (token) => token.symbol === "MON" && token.address === "NATIVE"
    ),
    // WMON should be third
    CORE_TOKENS.find((token) => token.symbol === "WMON"),
  ].filter((token): token is SwapToken => !!token);
};
