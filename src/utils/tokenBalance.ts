import { ethers } from "ethers";
import { Token } from "@/types/token";

/**
 * Format token amount for display
 * @param quantity The token amount
 * @param decimals The number of decimals for the token
 * @returns Formatted token amount as string
 */
export const formatTokenAmount = (
  quantity: number,
  decimals: number = 4
): string => {
  // For very small numbers, use scientific notation below a certain threshold
  if (quantity > 0 && quantity < 0.000001) {
    return quantity.toExponential(2); // Reduce from 6 to 2 significant digits for readability
  }

  // Otherwise use regular formatting with appropriate decimals
  // Cap at 6 decimals max as requested, or fewer based on token decimals
  const maxDecimals = Math.min(decimals, 6);

  // For larger numbers (>=0.01), use fewer decimal places for better readability
  const effectiveDecimals =
    quantity >= 0.01 ? Math.min(maxDecimals, 4) : maxDecimals;

  return quantity.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: effectiveDecimals,
  });
};

/**
 * Get the raw token balance without formatting (for numerical operations)
 * @param token The token object
 * @param assets Array of user's assets from adapter
 * @returns Raw token balance as number
 */
export const getTokenBalanceRaw = (token: Token, assets: any[]): number => {
  if (!assets) return 0;

  // Find the asset by address first (most accurate), then by symbol
  const asset = assets.find((asset) => {
    const implementation = asset.attributes.fungible_info?.implementations?.[0];
    const symbol = asset.attributes.fungible_info?.symbol;
    const contractAddr = implementation?.address?.toLowerCase();
    const tokenAddr =
      token.address !== "NATIVE" ? token.address.toLowerCase() : null;

    // For USDC, strictly match by official contract address
    if (token.symbol === "USDC") {
      return contractAddr === token.address.toLowerCase();
    }

    // For WMON, strictly match by official contract address
    if (token.symbol === "WMON") {
      return contractAddr === token.address.toLowerCase();
    }

    // Match native MON
    if (
      token.address === "NATIVE" &&
      (asset.id === "base-monad-test-v2-asset-asset" ||
        (symbol === "MON" && !implementation?.address))
    ) {
      return true;
    }

    // Match by address for regular tokens
    if (
      implementation?.address &&
      token.address !== "NATIVE" &&
      implementation.address.toLowerCase() === token.address.toLowerCase()
    ) {
      return true;
    }

    // Match by symbol as fallback (but NOT for USDC or WMON)
    return (
      symbol === token.symbol &&
      token.symbol !== "USDC" &&
      token.symbol !== "WMON"
    );
  });

  // Return the raw numeric value without formatting
  if (asset) {
    // Ensure we convert to number if it's a BigInt
    return Number(asset.attributes.quantity.float) || 0;
  }

  return 0;
};

/**
 * Get the formatted token balance for display
 * @param token The token object
 * @param assets Array of user's assets from adapter
 * @returns Formatted token balance as string
 */
export const getTokenBalanceFormatted = (
  token: Token,
  assets: any[]
): string => {
  // Get the raw balance first
  const rawBalance = getTokenBalanceRaw(token, assets);

  // Return 0 if there's no balance
  if (rawBalance === 0) return "0";

  // Get the token decimals for proper formatting
  const tokenDecimals =
    token.decimals ||
    assets.find((asset) => {
      const implementation =
        asset.attributes.fungible_info?.implementations?.[0];
      return (
        implementation?.address?.toLowerCase() === token.address.toLowerCase()
      );
    })?.attributes.fungible_info?.implementations?.[0]?.decimals ||
    6;

  // Format the balance
  return formatTokenAmount(rawBalance, tokenDecimals);
};

/**
 * Get the raw token balance in Wei for blockchain operations
 * @param token The token object
 * @param assets Array of user's assets from adapter
 * @returns Token balance in Wei as string
 */
export const getTokenBalanceWei = (token: Token, assets: any[]): string => {
  // Get the raw balance
  const rawBalance = getTokenBalanceRaw(token, assets);

  if (rawBalance === 0) return "0";

  try {
    // Format the balance with the correct decimals and convert to Wei
    return ethers.parseUnits(rawBalance.toString(), token.decimals).toString();
  } catch (e) {
    console.error("Error converting balance to Wei:", e);
    return "0";
  }
};
