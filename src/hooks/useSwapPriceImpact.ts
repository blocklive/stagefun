import { useState, useEffect } from "react";
import { Token } from "@/types/token";

// Constants
const HIGH_PRICE_IMPACT_THRESHOLD = 15; // 15%
const DEFAULT_SLIPPAGE_TOLERANCE = 0.005; // 0.5%

interface UseSwapPriceImpactProps {
  inputAmount: string;
  outputAmount: string;
  inputToken: Token | null;
  outputToken: Token | null;
  slippageTolerance?: number; // Optional, defaults to 0.5%
}

interface UseSwapPriceImpactResult {
  priceImpact: string | null;
  isPriceImpactTooHigh: boolean;
  minimumReceived: string | null;
  lowLiquidityMessage: string | null;
  isSwapLikelyInvalid: boolean;
}

/**
 * Hook to calculate price impact and minimum received amount for a swap
 * Uses a simplified constant product formula approach
 */
export function useSwapPriceImpact({
  inputAmount,
  outputAmount,
  inputToken,
  outputToken,
  slippageTolerance = DEFAULT_SLIPPAGE_TOLERANCE,
}: UseSwapPriceImpactProps): UseSwapPriceImpactResult {
  // State variables
  const [priceImpact, setPriceImpact] = useState<string | null>(null);
  const [isPriceImpactTooHigh, setIsPriceImpactTooHigh] = useState(false);
  const [minimumReceived, setMinimumReceived] = useState<string | null>(null);
  const [lowLiquidityMessage, setLowLiquidityMessage] = useState<string | null>(
    null
  );
  const [isSwapLikelyInvalid, setIsSwapLikelyInvalid] = useState(false);

  useEffect(() => {
    // Reset all values if any required values are missing
    if (!inputAmount || !outputAmount || !inputToken || !outputToken) {
      setPriceImpact(null);
      setIsPriceImpactTooHigh(false);
      setMinimumReceived(null);
      setLowLiquidityMessage(null);
      setIsSwapLikelyInvalid(false);
      return;
    }

    // Parse input and output amounts
    const numericInputAmount = parseFloat(inputAmount);
    const numericOutputAmount = parseFloat(outputAmount);

    // Validate numeric values
    if (
      isNaN(numericInputAmount) ||
      numericInputAmount <= 0 ||
      isNaN(numericOutputAmount) ||
      numericOutputAmount <= 0
    ) {
      setPriceImpact(null);
      setIsPriceImpactTooHigh(false);
      setMinimumReceived(null);
      setLowLiquidityMessage(null);
      setIsSwapLikelyInvalid(numericInputAmount > 0); // Invalid only if input > 0 but output is invalid
      return;
    }

    // Mark as invalid if input amount is positive but output amount is zero
    if (numericInputAmount > 0 && numericOutputAmount === 0) {
      setPriceImpact(null);
      setIsPriceImpactTooHigh(false);
      setMinimumReceived(null);
      setLowLiquidityMessage(null);
      setIsSwapLikelyInvalid(true);
      return;
    }

    // Calculate minimum received based on slippage tolerance
    const minReceivedVal = numericOutputAmount * (1 - slippageTolerance);
    setMinimumReceived(minReceivedVal.toFixed(outputToken.decimals));

    try {
      // Calculate price impact using the constant product formula approach
      // For a simple constant product AMM (x*y=k), price impact increases with trade size
      // relative to the pool reserves.

      // To best match actual AMM behavior:
      // - Use input amount relative to input token reserve
      // - Larger trades = higher impact, smaller trades = lower impact

      // Note: This uses the MON reserve (11.67) from pool statistics provided previously
      // For a more general/dynamic approach, you would query the actual reserves
      const inputReserve = 11.67; // Based on the pool provided - MON reserve

      // Calculate price impact as a function of input size relative to reserve
      const estimatedImpact =
        (numericInputAmount / (inputReserve + numericInputAmount)) * 100;

      // Format and set the price impact
      const formattedImpact = estimatedImpact.toFixed(2);
      setPriceImpact(formattedImpact);

      // Determine if price impact is too high
      if (estimatedImpact > HIGH_PRICE_IMPACT_THRESHOLD) {
        setIsPriceImpactTooHigh(true);
      } else {
        setIsPriceImpactTooHigh(false);
      }

      // Clear any previous low liquidity messages
      setLowLiquidityMessage(null);

      // Mark swap as valid
      setIsSwapLikelyInvalid(false);
    } catch (error) {
      console.error("Error calculating price impact:", error);
      setPriceImpact(null);
      setIsPriceImpactTooHigh(false);
      setLowLiquidityMessage(
        "Note: Price impact could not be calculated accurately."
      );
      setIsSwapLikelyInvalid(false); // Don't block the swap just because we can't calculate impact
    }
  }, [inputAmount, outputAmount, inputToken, outputToken, slippageTolerance]);

  return {
    priceImpact,
    isPriceImpactTooHigh,
    minimumReceived,
    lowLiquidityMessage,
    isSwapLikelyInvalid,
  };
}
