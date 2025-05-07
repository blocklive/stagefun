import { TokenWithBalance } from "./AlchemySDK";
import { Asset, AssetAttributes, AssetQuantity } from "@/lib/zerion/ZerionSDK";

// Minimum balance threshold (in token units) to display a token
const MIN_TOKEN_BALANCE = 0.00001;

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
  const tokenDecimals = token.metadata?.decimals || 18;
  const tokenLogo = token.metadata?.logo || "";

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
 * Also handles filtering out dust balances and deduplicating tokens
 */
export function alchemyTokensToZerionAssets(
  tokens: TokenWithBalance[]
): Asset[] {
  // First, filter out tokens with near-zero balances (dust)
  const filteredTokens = tokens.filter((token) => {
    const balance = parseFloat(token.formattedBalance || "0");
    // Keep tokens with balances above threshold or if they're native tokens
    return token.isNative || balance >= MIN_TOKEN_BALANCE;
  });

  // Track symbols we've already processed to prevent duplicates
  const processedSymbols = new Set<string>();

  // Track unique tokens, preferring the one with the highest balance for each symbol
  const uniqueTokensBySymbol = new Map<string, TokenWithBalance>();

  // First pass - identify highest balance token for each symbol
  filteredTokens.forEach((token) => {
    const symbol = token.metadata?.symbol || "";
    if (!symbol) return;

    // Special handling for native token
    if (token.isNative) {
      uniqueTokensBySymbol.set("NATIVE-MON", token);
      return;
    }

    // For all other tokens
    const existingToken = uniqueTokensBySymbol.get(symbol);
    const currentBalance = parseFloat(token.formattedBalance || "0");
    const existingBalance = existingToken
      ? parseFloat(existingToken.formattedBalance || "0")
      : 0;

    // Replace if this token has a higher balance
    if (!existingToken || currentBalance > existingBalance) {
      uniqueTokensBySymbol.set(symbol, token);
    }
  });

  // Convert unique tokens to Zerion assets
  return Array.from(uniqueTokensBySymbol.values()).map(
    alchemyTokenToZerionAsset
  );
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
