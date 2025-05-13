import { useState, useCallback, useEffect, useRef } from "react";
import { ethers } from "ethers";
import { getFactoryContract } from "@/lib/contracts/StageSwap";

interface Token {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  logoURI: string;
  isCustom?: boolean;
}

interface PoolRatio {
  reserveA: bigint;
  reserveB: bigint;
}

// Add these constants at the top level of the hook for consistency
const WMON_ADDRESS = "0x760AfE86e5de5fa0Ee542fc7B7B713e1c5425701";

export function usePoolManager(tokenA: Token, tokenB: Token) {
  const [poolExists, setPoolExists] = useState<boolean>(false);
  const [poolRatio, setPoolRatio] = useState<PoolRatio | null>(null);
  const [pairAddress, setPairAddress] = useState<string | null>(null);

  // Add a ref to store previous tokens to prevent unnecessary API calls
  const prevTokensRef = useRef<{ tokenA: string; tokenB: string } | null>(null);
  // Add a ref to track if a check is in progress
  const isCheckingRef = useRef(false);

  // Check if pool exists and get reserves
  const checkPoolExists = useCallback(async () => {
    if (!tokenA.address || !tokenB.address || isCheckingRef.current) {
      return false;
    }

    try {
      // Set checking flag
      isCheckingRef.current = true;

      console.log("Starting pool existence check for:", {
        tokenA: {
          symbol: tokenA.symbol,
          address: tokenA.address,
        },
        tokenB: {
          symbol: tokenB.symbol,
          address: tokenB.address,
        },
      });

      // Validate addresses before making contract calls
      const isValidAddressA =
        tokenA.address === "NATIVE" || ethers.isAddress(tokenA.address);
      const isValidAddressB =
        tokenB.address === "NATIVE" || ethers.isAddress(tokenB.address);

      if (!isValidAddressA || !isValidAddressB) {
        console.warn("Invalid token addresses, skipping pool existence check");
        setPoolExists(false);
        setPoolRatio(null);
        isCheckingRef.current = false;
        return false;
      }

      const provider = new ethers.JsonRpcProvider(
        process.env.NEXT_PUBLIC_RPC_URL
      );
      const factoryContract = await getFactoryContract(provider);

      // Handle native token addresses - replace "NATIVE" with the WMON address
      const effectiveTokenAAddress =
        tokenA.address === "NATIVE" ? WMON_ADDRESS : tokenA.address;
      const effectiveTokenBAddress =
        tokenB.address === "NATIVE" ? WMON_ADDRESS : tokenB.address;

      console.log("Checking pool for tokens:", {
        tokenA: tokenA.symbol,
        tokenAAddress: effectiveTokenAAddress,
        tokenB: tokenB.symbol,
        tokenBAddress: effectiveTokenBAddress,
      });

      try {
        // Check if pair exists
        const pairAddress = await factoryContract.getPair(
          effectiveTokenAAddress,
          effectiveTokenBAddress
        );
        setPairAddress(pairAddress);

        console.log("Pair address result:", pairAddress);

        // If zero address, no pool exists
        if (pairAddress === "0x0000000000000000000000000000000000000000") {
          console.log("No pool exists - setting poolExists to false");
          setPoolExists(false);
          setPoolRatio(null);
          isCheckingRef.current = false;
          return false;
        }

        // Get pool reserves
        const pairContract = new ethers.Contract(
          pairAddress,
          [
            "function getReserves() external view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast)",
            "function token0() external view returns (address)",
            "function totalSupply() view returns (uint)",
          ],
          provider
        );

        const [reserves, token0, totalSupply] = await Promise.all([
          pairContract.getReserves(),
          pairContract.token0(),
          pairContract.totalSupply(),
        ]);

        // Log total supply to check if the pool has LP tokens
        console.log(
          `Pool total supply of LP tokens: ${ethers.formatUnits(
            totalSupply,
            18
          )}`
        );

        // Determine which reserve is which based on token order
        const isTokenAZero =
          effectiveTokenAAddress.toLowerCase() === token0.toLowerCase();
        const reserveA = isTokenAZero
          ? BigInt(reserves[0])
          : BigInt(reserves[1]);
        const reserveB = isTokenAZero
          ? BigInt(reserves[1])
          : BigInt(reserves[0]);

        // Format to human-readable numbers for checking emptiness
        const reserveAValue = Number(
          ethers.formatUnits(reserveA, tokenA.decimals)
        );
        const reserveBValue = Number(
          ethers.formatUnits(reserveB, tokenB.decimals)
        );

        console.log(
          `Pool reserves: ${reserveAValue} ${tokenA.symbol}, ${reserveBValue} ${tokenB.symbol}`
        );

        // Check if pool is effectively empty (reserves are very small)
        // Using a higher threshold (0.05) to consider pools with tiny amounts as empty
        const DUST_THRESHOLD = 0.05;
        const isPoolEmpty =
          reserveAValue === 0 ||
          reserveAValue < DUST_THRESHOLD ||
          reserveBValue === 0 ||
          reserveBValue < DUST_THRESHOLD;

        console.log(
          `Pool emptiness check: reserveA=${reserveAValue}, reserveB=${reserveBValue}, DUST_THRESHOLD=${DUST_THRESHOLD}, isPoolEmpty=${isPoolEmpty}`
        );

        // Check total supply too - if there are no LP tokens, treat as empty pool
        const totalSupplyValue = Number(ethers.formatUnits(totalSupply, 18));

        // For LP tokens, use a much smaller threshold - LP tokens can be very small
        // even when the pool has significant reserves
        const LP_DUST_THRESHOLD = 1e-12; // Extremely small threshold for LP tokens
        const isLpSupplyEmpty =
          totalSupplyValue === 0 || totalSupplyValue < LP_DUST_THRESHOLD;

        console.log(
          `LP supply check: totalSupply=${totalSupplyValue}, LP_DUST_THRESHOLD=${LP_DUST_THRESHOLD}, isLpSupplyEmpty=${isLpSupplyEmpty}`
        );

        console.log(
          `Total LP supply: ${totalSupplyValue}, isLpSupplyEmpty: ${isLpSupplyEmpty}`
        );

        // If both tokens have significant reserves, consider pool as valid regardless of LP supply
        const SIGNIFICANT_RESERVE = 1.0; // Higher threshold for significant reserves
        const hasSignificantReserves =
          reserveAValue > SIGNIFICANT_RESERVE &&
          reserveBValue > SIGNIFICANT_RESERVE;

        console.log(
          `Significant reserves check: reserveA=${reserveAValue}, reserveB=${reserveBValue}, SIGNIFICANT_RESERVE=${SIGNIFICANT_RESERVE}, hasSignificantReserves=${hasSignificantReserves}`
        );

        // Consider the pool empty if reserves are low OR (LP supply is empty AND there are no significant reserves)
        const considerPoolEmpty =
          isPoolEmpty || (isLpSupplyEmpty && !hasSignificantReserves);

        if (considerPoolEmpty) {
          // Pool exists but is effectively empty - treat it like a new pool
          console.log(
            `Pool exists but treating as new pool because: isPoolEmpty=${isPoolEmpty}, isLpSupplyEmpty=${isLpSupplyEmpty}, hasSignificantReserves=${hasSignificantReserves}`
          );
          setPoolExists(false);
          setPoolRatio(null);
          isCheckingRef.current = false;
          return false;
        } else {
          console.log(
            `Pool ratio: 1 ${tokenA.symbol} = ${
              reserveBValue / reserveAValue
            } ${tokenB.symbol}`
          );
          setPoolExists(true);
          setPoolRatio({ reserveA, reserveB });

          // If the pool has significant reserves, display ratio information
          const SIGNIFICANT_AMOUNT = 0.05; // Higher threshold to match DUST_THRESHOLD
          if (
            reserveAValue > SIGNIFICANT_AMOUNT ||
            reserveBValue > SIGNIFICANT_AMOUNT
          ) {
            console.log(
              `Current pool ratio: 1 ${tokenA.symbol} = ${
                reserveBValue / reserveAValue
              } ${tokenB.symbol}`
            );
          }
          isCheckingRef.current = false;
          return true;
        }
      } catch (error) {
        // This catches specific contract call errors, e.g. CALL_EXCEPTION
        console.warn("Contract call error, assuming new pool:", error);
        setPoolExists(false);
        setPoolRatio(null);
        isCheckingRef.current = false;
        return false;
      }
    } catch (error) {
      // This catches more general errors
      console.error("Error checking pool existence:", error);
      setPoolExists(false);
      setPoolRatio(null);
      isCheckingRef.current = false;
      return false;
    }
  }, [
    tokenA.address,
    tokenB.address,
    tokenA.decimals,
    tokenB.decimals,
    tokenA.symbol,
    tokenB.symbol,
  ]);

  // Calculate paired amount based on pool ratio
  const calculatePairedAmount = useCallback(
    (inputAmount: string, inputToken: Token, outputToken: Token) => {
      // Handle special cases of invalid inputs
      if (!poolRatio || !inputAmount) return "";

      // Additional validation for inputAmount
      try {
        // Check if the input is valid for calculation
        // Handle edge cases like "." or starting with decimal
        if (inputAmount === "." || inputAmount === "") return "";

        // Normalize input to ensure it's valid for parseUnits
        // If it's just a decimal point, add a leading zero
        const normalizedInput = inputAmount.startsWith(".")
          ? `0${inputAmount}`
          : inputAmount;

        // Check if it's a valid number and greater than zero
        const floatValue = parseFloat(normalizedInput);
        if (isNaN(floatValue) || floatValue <= 0) return "";

        const amount = ethers.parseUnits(normalizedInput, inputToken.decimals);

        // Handle native token addresses
        const effectiveTokenAAddress =
          tokenA.address === "NATIVE" ? WMON_ADDRESS : tokenA.address;
        const effectiveInputTokenAddress =
          inputToken.address === "NATIVE" ? WMON_ADDRESS : inputToken.address;

        let result;
        if (effectiveInputTokenAddress === effectiveTokenAAddress) {
          // Calculate tokenB amount based on tokenA input
          result = (amount * poolRatio.reserveB) / poolRatio.reserveA;
        } else {
          // Calculate tokenA amount based on tokenB input
          result = (amount * poolRatio.reserveA) / poolRatio.reserveB;
        }

        // Format with proper precision
        const formattedResult = ethers.formatUnits(
          result,
          outputToken.decimals
        );

        // Check if input is an integer (no decimal point)
        const isInputInteger = /^\d+$/.test(inputAmount);

        // For integer inputs, if the result is very close to an integer value,
        // round it to preserve the expected ratio
        if (isInputInteger) {
          const parsedResult = parseFloat(formattedResult);
          const closeToInteger =
            Math.abs(Math.round(parsedResult) - parsedResult) < 0.0001;

          if (closeToInteger) {
            return Math.round(parsedResult).toString();
          }
        }

        // For consistency when handling small decimals, limit to 8 decimal places
        // but only when necessary (don't convert integers to decimals)
        if (formattedResult.includes(".")) {
          const parts = formattedResult.split(".");
          if (parts[1] && parts[1].length > 8) {
            return `${parts[0]}.${parts[1].substring(0, 8)}`;
          }
        }

        return formattedResult;
      } catch (error) {
        console.error("Error calculating paired amount:", error);
        return "";
      }
    },
    [poolRatio, tokenA.address]
  );

  // Format display ratio between tokens
  const getDisplayRatio = useCallback(() => {
    if (!poolRatio) return null;

    try {
      // Calculate how many of token B for 1 of token A
      const oneTokenA = ethers.parseUnits("1", tokenA.decimals);
      const equivalentTokenB =
        (oneTokenA * poolRatio.reserveB) / poolRatio.reserveA;
      return ethers.formatUnits(equivalentTokenB, tokenB.decimals);
    } catch (error) {
      console.error("Error calculating ratio:", error);
      return null;
    }
  }, [poolRatio, tokenA.decimals, tokenB.decimals]);

  // Simple effect to check if tokens have changed
  useEffect(() => {
    // Normalize addresses for comparison
    const currentTokenA = (
      tokenA.address === "NATIVE" ? WMON_ADDRESS : tokenA.address
    ).toLowerCase();
    const currentTokenB = (
      tokenB.address === "NATIVE" ? WMON_ADDRESS : tokenB.address
    ).toLowerCase();

    // Skip if tokens haven't changed (in either direction)
    const tokensChanged =
      !prevTokensRef.current ||
      !(
        (prevTokensRef.current.tokenA === currentTokenA &&
          prevTokensRef.current.tokenB === currentTokenB) ||
        (prevTokensRef.current.tokenA === currentTokenB &&
          prevTokensRef.current.tokenB === currentTokenA)
      );

    // Always check the pool exists on first render even if tokens haven't changed
    // This helps when switching between tabs (Swap to Add Liquidity)
    const shouldCheck = tokensChanged || !poolExists;

    if (!shouldCheck) {
      return;
    }

    console.log("Token change effect triggered");

    // Save current tokens to ref for future comparisons
    prevTokensRef.current = { tokenA: currentTokenA, tokenB: currentTokenB };

    // Only if not already checking, reset the state and check pool existence
    if (!isCheckingRef.current) {
      // Reset poolExists to false to show loading state
      setPoolExists(false);
      setPoolRatio(null);

      // Execute the check immediately without setTimeout
      checkPoolExists().catch(console.error);
    }

    // No need for cleanup since we're not using timeouts
  }, [tokenA.address, tokenB.address, checkPoolExists, poolExists]);

  // Add a component mount effect to force check on page load/navigation
  useEffect(() => {
    console.log("Component mount effect triggered");
    // Check pool existence on component mount
    checkPoolExists().catch(console.error);

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty dependency array means this runs once on mount

  return {
    poolExists,
    poolRatio,
    pairAddress,
    checkPoolExists,
    calculatePairedAmount,
    getDisplayRatio,
  };
}
