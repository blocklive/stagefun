import { useState, useEffect, useRef } from "react";
import { Token } from "@/types/token";
import { CONTRACT_ADDRESSES } from "@/lib/contracts/addresses";
import { useStageSwap } from "@/hooks/useStageSwap";
import { ethers } from "ethers";

// Constants
const HIGH_PRICE_IMPACT_THRESHOLD = 15; // 15%
const DEFAULT_SLIPPAGE_TOLERANCE = 0.005; // 0.5%
const WMON_ADDRESS = CONTRACT_ADDRESSES.monadTestnet.weth;
const MAX_RETRIES = 3; // Maximum number of retry attempts
const DEBOUNCE_DELAY = 300; // Debounce delay in milliseconds

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
  isCalculating: boolean; // Added loading state
}

/**
 * Format a number to a maximum of 8 decimal places for display
 */
const formatDisplayValue = (value: number, decimals: number = 8): string => {
  // Cap at 8 decimals maximum for UI display
  const maxDecimals = Math.min(decimals, 8);
  return value.toFixed(maxDecimals);
};

/**
 * Retry function with exponential backoff
 * @param fn Function to retry
 * @param retries Number of retries
 * @param baseDelay Base delay in ms
 * @returns Promise with the result
 */
const retryWithBackoff = async <T>(
  fn: () => Promise<T>,
  retries = MAX_RETRIES,
  baseDelay = 300
): Promise<T> => {
  try {
    return await fn();
  } catch (error) {
    // Check if the error is related to rate limiting (status 429)
    const isRateLimitError =
      error instanceof Error &&
      (error.message.includes("429") ||
        error.message.includes("rate limit") ||
        error.message.includes("requests limited"));

    // If we have retries left and it's a rate limit error, retry with backoff
    if (retries > 0 && isRateLimitError) {
      // Calculate exponential backoff delay: baseDelay * 2^(MAX_RETRIES - retries)
      // e.g., for baseDelay=300, retries on attempts will be: 300ms, 600ms, 1200ms
      const delay = baseDelay * Math.pow(2, MAX_RETRIES - retries);
      console.log(
        `Rate limited, retrying in ${delay}ms... (${retries} attempts left)`
      );

      // Wait for the calculated delay
      await new Promise((resolve) => setTimeout(resolve, delay));

      // Retry with one less retry
      return retryWithBackoff(fn, retries - 1, baseDelay);
    }

    // If no retries left or not a rate limit error, throw the error
    throw error;
  }
};

/**
 * Hook to calculate price impact and minimum received amount for a swap
 * Uses a constant product formula approach (x*y=k)
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
  const [isCalculating, setIsCalculating] = useState(false); // Added loading state

  // Track the last input/output values that were used for calculation
  // This helps detect if output is stale compared to input
  const lastCalculatedRef = useRef({
    inputAmount: "",
    outputAmount: "",
  });

  // Debounce timer reference
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Use the existing StageSwap hook for getting pool information
  const { getPair } = useStageSwap();

  // Function to check if input/output values are consistent
  const areValuesConsistent = () => {
    // Simple consistency check for MON <-> WMON 1:1 conversion
    const isInputNative = inputToken?.address === "NATIVE";
    const isOutputNative = outputToken?.address === "NATIVE";
    const isWmonToMon = isOutputNative && inputToken?.address === WMON_ADDRESS;
    const isMonToWmon = isInputNative && outputToken?.address === WMON_ADDRESS;

    if (isWmonToMon || isMonToWmon) {
      // For MON <-> WMON direct conversion, input and output should be equal
      return inputAmount === outputAmount;
    }

    // For normal pairs, check if the output has been updated since the input changed
    // If values match what was last calculated, they're consistent
    return (
      inputAmount === lastCalculatedRef.current.inputAmount &&
      outputAmount === lastCalculatedRef.current.outputAmount &&
      inputAmount !== "" &&
      outputAmount !== ""
    );
  };

  useEffect(() => {
    // Clear any existing debounce timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }

    // Reset all values if any required values are missing
    if (!inputAmount || !outputAmount || !inputToken || !outputToken) {
      setPriceImpact(null);
      setIsPriceImpactTooHigh(false);
      setMinimumReceived(null);
      setLowLiquidityMessage(null);
      setIsSwapLikelyInvalid(false);
      setIsCalculating(false);
      return;
    }

    // Check if this is a MON <-> WMON direct conversion
    const isInputNative = inputToken.address === "NATIVE";
    const isOutputNative = outputToken.address === "NATIVE";
    const isWmonToMon = isOutputNative && inputToken.address === WMON_ADDRESS;
    const isMonToWmon = isInputNative && outputToken.address === WMON_ADDRESS;

    // For MON <-> WMON pairs, there is zero price impact - it's a 1:1 wrap/unwrap
    if (isWmonToMon || isMonToWmon) {
      setPriceImpact("0.00");
      setIsPriceImpactTooHigh(false);
      // Display with limited decimal places for 1:1 conversion
      setMinimumReceived(outputAmount);
      setLowLiquidityMessage(null);
      setIsSwapLikelyInvalid(false);
      setIsCalculating(false);

      // Update the last calculated values
      lastCalculatedRef.current = {
        inputAmount,
        outputAmount,
      };

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
      setIsCalculating(false);
      return;
    }

    // Mark as invalid if input amount is positive but output amount is zero
    if (numericInputAmount > 0 && numericOutputAmount === 0) {
      setPriceImpact(null);
      setIsPriceImpactTooHigh(false);
      setMinimumReceived(null);
      setLowLiquidityMessage(null);
      setIsSwapLikelyInvalid(true);
      setIsCalculating(false);
      return;
    }

    // Calculate minimum received based on slippage tolerance
    const minReceivedVal = numericOutputAmount * (1 - slippageTolerance);

    // Format minReceivedVal with at most 8 decimal places for UI display
    setMinimumReceived(formatDisplayValue(minReceivedVal, 8));

    // Set calculating to true when starting the calculation
    setIsCalculating(true);

    // Debounce the calculation to wait for both input and output to stabilize
    debounceTimerRef.current = setTimeout(async () => {
      // Calculate price impact using pool reserves
      const calculatePriceImpact = async () => {
        try {
          // Get token addresses for pool lookup (handle NATIVE -> WMON)
          const tokenA = isInputNative ? WMON_ADDRESS : inputToken.address;
          const tokenB = isOutputNative ? WMON_ADDRESS : outputToken.address;

          // Get pool information using the getPair function from useStageSwap
          // Wrap in retry logic to handle rate limiting
          const pairInfo = await retryWithBackoff(async () => {
            return await getPair({ tokenA, tokenB });
          });

          // Store the values we calculated for, to check consistency later
          lastCalculatedRef.current = {
            inputAmount,
            outputAmount,
          };

          // If pool doesn't exist or request failed
          if (
            !pairInfo.success ||
            !pairInfo.reserves ||
            pairInfo.pairAddress === ethers.ZeroAddress
          ) {
            setPriceImpact(null);
            setIsPriceImpactTooHigh(false);
            setLowLiquidityMessage("No liquidity found for this pair");
            setIsCalculating(false);
            return;
          }

          // Get reserves from the pair info
          const [reserveA, reserveB] = pairInfo.reserves;

          // If reserves are zero
          if (
            !reserveA ||
            !reserveB ||
            reserveA === BigInt(0) ||
            reserveB === BigInt(0)
          ) {
            setPriceImpact(null);
            setIsPriceImpactTooHigh(false);
            setLowLiquidityMessage("No liquidity found for this pair");
            setIsCalculating(false);
            return;
          }

          // Convert reserves to numbers for calculation
          const inputTokenDecimals = inputToken.decimals || 18;
          const outputTokenDecimals = outputToken.decimals || 18;

          const inputReserveFloat = parseFloat(
            ethers.formatUnits(reserveA, inputTokenDecimals)
          );
          const outputReserveFloat = parseFloat(
            ethers.formatUnits(reserveB, outputTokenDecimals)
          );

          // Calculate spot price before the swap (output/input)
          const spotPrice = outputReserveFloat / inputReserveFloat;

          // Calculate execution price (output amount / input amount)
          const executionPrice = numericOutputAmount / numericInputAmount;

          // Calculate price impact: 1 - (execution price / spot price)
          const impact = (1 - executionPrice / spotPrice) * 100;

          // Ensure we don't show negative price impact (which can happen due to rounding)
          const adjustedImpact = Math.max(0, impact);

          // Format and set the price impact
          const formattedImpact = adjustedImpact.toFixed(2);
          setPriceImpact(formattedImpact);

          // Determine if price impact is too high
          if (adjustedImpact > HIGH_PRICE_IMPACT_THRESHOLD) {
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
        } finally {
          // Set calculating to false when done
          setIsCalculating(false);
        }
      };

      calculatePriceImpact();
    }, DEBOUNCE_DELAY);

    // Clean up the timeout if the component unmounts or dependencies change
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [
    inputAmount,
    outputAmount,
    inputToken,
    outputToken,
    slippageTolerance,
    getPair,
  ]);

  return {
    priceImpact: areValuesConsistent() ? priceImpact : null,
    isPriceImpactTooHigh: areValuesConsistent() ? isPriceImpactTooHigh : false,
    minimumReceived,
    lowLiquidityMessage,
    isSwapLikelyInvalid,
    isCalculating: isCalculating || !areValuesConsistent(),
  };
}
