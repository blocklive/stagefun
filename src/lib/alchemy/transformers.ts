import { TokenWithBalance } from "./AlchemySDK";
import { Asset, AssetAttributes, AssetQuantity } from "@/lib/zerion/ZerionSDK";
import { CONTRACT_ADDRESSES } from "@/lib/contracts/addresses";

// Minimum balance threshold (in token units) to display a token
const MIN_TOKEN_BALANCE = 0.00001;

// Official WMON address for validation
const OFFICIAL_WMON_ADDRESS =
  CONTRACT_ADDRESSES.monadTestnet.officialWmon.toLowerCase();

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

  // Special handling for WMON - rename non-official WMON tokens to avoid confusion
  const isWmonSymbol = tokenSymbol === "WMON";
  const isOfficialWmon =
    contractAddress.toLowerCase() === OFFICIAL_WMON_ADDRESS;

  // For non-official WMON tokens, add "Unofficial" to the name
  const displaySymbol =
    isWmonSymbol && !isOfficialWmon ? "WMON (Unofficial)" : tokenSymbol;
  const displayName =
    isWmonSymbol && !isOfficialWmon ? "Unofficial Wrapped MON" : tokenName;

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
    name: displayName,
    position_type: "simple",
    quantity,
    value: token.value || null,
    price: 0, // Alchemy doesn't provide price data in this format
    fungible_info: {
      name: displayName,
      symbol: displaySymbol,
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

  // Special case for WMON - always prefer the official address
  let officialWmonFound = false;
  let officialWmonToken: TokenWithBalance | null = null;
  let unofficialWmonWithHighestBalance: TokenWithBalance | null = null;
  let maxUnofficialWmonBalance = 0;

  // First pass - identify all WMON tokens and find the official one
  filteredTokens.forEach((token) => {
    const symbol = token.metadata?.symbol || "";
    const contractAddress = token.contractAddress?.toLowerCase() || "";

    if (symbol === "WMON") {
      const balance = parseFloat(token.formattedBalance || "0");

      if (contractAddress === OFFICIAL_WMON_ADDRESS) {
        officialWmonFound = true;
        officialWmonToken = token;
      } else if (balance > maxUnofficialWmonBalance) {
        maxUnofficialWmonBalance = balance;
        unofficialWmonWithHighestBalance = token;
      }
    }
  });

  // If we have unofficial WMON but no official WMON with balance,
  // rename the unofficial one to avoid confusion
  if (!officialWmonFound && unofficialWmonWithHighestBalance) {
    console.log(
      "Using unofficial WMON with balance:",
      maxUnofficialWmonBalance
    );
  }

  // Second pass - process all tokens
  filteredTokens.forEach((token) => {
    const symbol = token.metadata?.symbol || "";
    if (!symbol) return;

    // Special handling for native token
    if (token.isNative) {
      uniqueTokensBySymbol.set("NATIVE-MON", token);
      return;
    }

    // Special handling for WMON tokens
    if (symbol === "WMON") {
      const contractAddress = token.contractAddress?.toLowerCase() || "";

      // Skip unofficial WMON if we found official WMON
      if (contractAddress !== OFFICIAL_WMON_ADDRESS && officialWmonFound) {
        console.log(`Ignoring unofficial WMON at ${contractAddress}`);
        return;
      }

      // Otherwise, use the highest balance version
      const existingToken = uniqueTokensBySymbol.get("WMON");
      const currentBalance = parseFloat(token.formattedBalance || "0");
      const existingBalance = existingToken
        ? parseFloat(existingToken.formattedBalance || "0")
        : 0;

      if (!existingToken || currentBalance > existingBalance) {
        uniqueTokensBySymbol.set("WMON", token);
      }
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
