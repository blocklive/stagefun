import { TokenWithBalance } from "./AlchemySDK";
import { Asset, AssetAttributes, AssetQuantity } from "@/lib/zerion/ZerionSDK";
import { CONTRACT_ADDRESSES } from "@/lib/contracts/addresses";

// Minimum balance threshold (in token units) to display a token
const MIN_TOKEN_BALANCE = 0.00001;

// Official token addresses for validation
const OFFICIAL_WMON_ADDRESS =
  CONTRACT_ADDRESSES.monadTestnet.officialWmon.toLowerCase();
const OFFICIAL_USDC_ADDRESS =
  CONTRACT_ADDRESSES.monadTestnet.usdc.toLowerCase();

/**
 * Convert Alchemy token format to Zerion asset format
 * This allows us to use Alchemy tokens with components that expect Zerion assets
 */
export function alchemyTokenToZerionAsset(token: TokenWithBalance): Asset {
  // Create a unique ID based on chain and address
  const contractAddress = token.contractAddress || "native";
  const id = `alchemy-monad-test-v2-${contractAddress}`;

  // Extract and convert token data
  const tokenSymbol = token.metadata?.symbol || "Unknown";
  const tokenName = token.metadata?.name || "Unknown Token";
  const tokenDecimals = token.metadata?.decimals || 6;
  const tokenLogo = token.metadata?.logo || "";

  // Contract address in lowercase for comparisons
  const contractAddressLower = contractAddress.toLowerCase();

  // For verification purposes: check for official tokens
  const isVerified =
    token.isOfficialWmon ||
    token.isOfficialUsdc ||
    (tokenSymbol === "WMON" &&
      contractAddressLower === OFFICIAL_WMON_ADDRESS) ||
    (tokenSymbol === "USDC" && contractAddressLower === OFFICIAL_USDC_ADDRESS);

  // Use formattedBalance instead of parsing the hex tokenBalance
  const balanceFloat = parseFloat(token.formattedBalance || "0");

  // Create quantity object in Zerion format
  const quantity: AssetQuantity = {
    int: token.tokenBalance || "0", // Keep the original hex balance for reference
    float: balanceFloat,
    decimals: tokenDecimals,
    numeric: token.formattedBalance || "0", // Use formattedBalance as the human-readable string
  };

  // Create attributes object in Zerion format
  const attributes: AssetAttributes = {
    name: tokenName,
    position_type: "simple",
    quantity,
    value: token.value || null,
    price: 0, // Alchemy doesn't provide price data in this format
    fungible_info: {
      name: tokenName,
      symbol: tokenSymbol,
      decimals: tokenDecimals,
      implementations: [
        {
          address: token.isNative ? null : token.contractAddress,
          chain_id: "monad-test-v2",
        },
      ],
      icon: {
        url: tokenLogo,
      },
    },
    isVerified: isVerified,
  };

  // Create the complete asset object
  return {
    type: "asset",
    id,
    attributes,
    relationships: {},
  };
}

/**
 * Convert an array of Alchemy tokens to Zerion assets
 * Also handles filtering out dust balances
 */
export function alchemyTokensToZerionAssets(
  tokens: TokenWithBalance[]
): Asset[] {
  // First, filter out tokens with near-zero balances (dust)
  const filteredTokens = tokens.filter((token) => {
    const balance = parseFloat(token.formattedBalance || "0");
    // Keep tokens with balances above threshold or if they're native tokens
    const keep = token.isNative || balance >= MIN_TOKEN_BALANCE;

    return keep;
  });

  // Convert filtered tokens to Zerion assets
  const assets = filteredTokens.map(alchemyTokenToZerionAsset);

  return assets;
}

/**
 * Create a combined wrapper that returns tokens from both Alchemy and Zerion
 * This can be used to gradually migrate from Zerion to Alchemy
 */
export function combineAssets(
  alchemyAssets: Asset[],
  zerionAssets: Asset[]
): Asset[] {
  // For overlapping assets (by symbol), prefer Alchemy
  const alchemySymbols = new Set(
    alchemyAssets.map((asset) => asset.attributes.fungible_info?.symbol || "")
  );

  // Filter out Zerion assets that would overlap with Alchemy
  const filteredZerionAssets = zerionAssets.filter(
    (asset) => !alchemySymbols.has(asset.attributes.fungible_info?.symbol || "")
  );

  // Combine the two sets
  return [...alchemyAssets, ...filteredZerionAssets];
}
