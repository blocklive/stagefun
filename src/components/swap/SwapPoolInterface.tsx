"use client";

import React, {
  useState,
  useCallback,
  useEffect,
  Suspense,
  useRef,
} from "react";
import { ethers } from "ethers";
import { usePrivy } from "@privy-io/react-auth";
import { useWalletAssetsAdapter } from "@/hooks/useWalletAssetsAdapter";
import { CONTRACT_ADDRESSES } from "@/lib/contracts/addresses";
import { useTokenList } from "@/hooks/useTokenList";
import { useTokenResolver } from "@/hooks/useTokenResolver";
import { TokenInfo } from "@/types/tokens";
import { Token } from "@/types/token";
import { useSearchParams } from "next/navigation";

// Import all the new components
import { PoolStatusCard } from "./PoolStatusCard";
import { FeeDisplay } from "./FeeDisplay";
import { TokenInputSection } from "./TokenInputSection";
import { SlippageSettings } from "./SlippageSettings";
import { InfoCard } from "./InfoCard";
import { LiquidityActions } from "./LiquidityActions";

// Import custom hooks
import { usePoolManager } from "@/hooks/usePoolManager";
import { useSmartWallet } from "@/hooks/useSmartWallet";

// Define Token interface
interface SwapToken {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  logoURI: string;
  isCustom?: boolean;
  isVerified?: boolean;
}

// Fixed fee - 0.3% for all pools based on Uniswap V2
const FIXED_FEE = {
  fee: 30, // 0.3%
  displayName: "0.3%",
  description: "Standard fee for all pools",
};

// Official WMON token address
const OFFICIAL_WMON_ADDRESS = "0x760AfE86e5de5fa0Ee542fc7B7B713e1c5425701";

// Token data with real contract addresses
const CORE_TOKENS: SwapToken[] = [
  {
    address: CONTRACT_ADDRESSES.monadTestnet.usdc,
    symbol: "USDC",
    name: "USD Coin",
    decimals: 6,
    logoURI: "/icons/usdc-logo.svg",
    isVerified: true,
  },
  {
    address: "NATIVE", // Special marker for native MON
    symbol: "MON",
    name: "Monad",
    decimals: 18,
    logoURI: "/icons/mon-logo.svg",
    isVerified: true,
  },
  {
    address: OFFICIAL_WMON_ADDRESS,
    symbol: "WMON",
    name: "Wrapped MON",
    decimals: 18,
    logoURI: "/icons/mon-logo.svg",
    isVerified: true,
  },
];

// Adding formatTokenAmount function based on WalletAssets.tsx
const formatTokenAmount = (quantity: number, decimals: number = 4): string => {
  // Convert any BigInt values to numbers at the entry point
  const safeDecimals = Number(decimals);
  const safeQuantity = Number(quantity);

  // For very small numbers, use scientific notation below a certain threshold
  if (safeQuantity > 0 && safeQuantity < 0.000001) {
    return safeQuantity.toExponential(6);
  }

  // Otherwise use regular formatting with appropriate decimals
  const maxDecimals = Math.min(safeDecimals, 6);

  return safeQuantity.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: maxDecimals,
  });
};

// Internal component with all the logic
function SwapPoolInterfaceContent() {
  const { user } = usePrivy();
  const { smartWalletAddress } = useSmartWallet();
  const searchParamsHook = useSearchParams();

  // Set a loading state for initial render
  const [initialLoading, setInitialLoading] = useState(true);

  // Get all tokens including custom ones
  const { customTokens } = useTokenList();
  const [allTokens, setAllTokens] = useState<SwapToken[]>(CORE_TOKENS);

  // Combine core tokens with custom tokens
  useEffect(() => {
    setAllTokens([...CORE_TOKENS, ...(customTokens as any)]);
  }, [customTokens]);

  // Token state
  const [tokenA, setTokenA] = useState<SwapToken>(CORE_TOKENS[0]); // USDC
  const [tokenB, setTokenB] = useState<SwapToken>(CORE_TOKENS[1]); // MON
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);

  // Amounts state
  const [amountA, setAmountA] = useState("");
  const [amountB, setAmountB] = useState("");

  // Create a ref to track which tokens have been loaded from URL
  const tokenLoadTracker = useRef<{ tokenA: boolean; tokenB: boolean }>({
    tokenA: false,
    tokenB: false,
  });

  // Create stable callback functions for token changes with auto-switching logic
  const handleTokenAChange = useCallback(
    (token: TokenInfo) => {
      console.log("handleTokenAChange called with:", token.symbol);

      // During initial load from URL, just set the token without auto-switching
      if (!initialLoadComplete) {
        console.log(
          "Initial load from URL - setting token A directly:",
          token.symbol
        );
        setTokenA(token as any);

        // Mark tokenA as loaded
        tokenLoadTracker.current.tokenA = true;

        // If both tokens are loaded from URL, mark initialization as complete
        if (
          tokenLoadTracker.current.tokenA &&
          tokenLoadTracker.current.tokenB
        ) {
          console.log("Both tokens loaded from URL, completing initialization");
          setInitialLoadComplete(true);
        }

        return;
      }

      // If user selects the same token that's already in the second position (tokenB)
      if (
        tokenB &&
        token.address &&
        tokenB.address &&
        token.address.toLowerCase() === tokenB.address.toLowerCase()
      ) {
        // Swap the tokens to maintain uniqueness
        console.log(
          "Auto-switching tokens: Same token selected for both inputs"
        );
        const currentTokenB = { ...tokenB }; // Create a copy to avoid reference issues

        // First update tokenA to the current tokenB
        setTokenA(currentTokenB as any);

        // // Then set tokenB to the new token
        setTimeout(() => {
          setTokenB(token as any);
        }, 0);

        console.log(
          "After switch: TokenA:",
          currentTokenB.symbol,
          "TokenB:",
          token.symbol
        );
      } else {
        // Otherwise just set the new token
        setTokenA(token as any);
      }
    },
    [tokenB, initialLoadComplete]
  );

  const handleTokenBChange = useCallback(
    (token: TokenInfo) => {
      console.log("handleTokenBChange called with:", token.symbol);

      // During initial load from URL, just set the token without auto-switching
      if (!initialLoadComplete) {
        console.log(
          "Initial load from URL - setting token B directly:",
          token.symbol
        );
        setTokenB(token as any);

        // Mark tokenB as loaded
        tokenLoadTracker.current.tokenB = true;

        // If both tokens are loaded from URL, mark initialization as complete
        if (
          tokenLoadTracker.current.tokenA &&
          tokenLoadTracker.current.tokenB
        ) {
          console.log("Both tokens loaded from URL, completing initialization");
          setInitialLoadComplete(true);
        }

        return;
      }

      // If user selects the same token that's already in the first position (tokenA)
      if (
        tokenA &&
        token.address &&
        tokenA.address &&
        token.address.toLowerCase() === token.address.toLowerCase()
      ) {
        // Swap the tokens to maintain uniqueness
        console.log(
          "Auto-switching tokens: Same token selected for both inputs"
        );
        const currentTokenA = { ...tokenA }; // Create a copy to avoid reference issues

        // First update tokenB to the current tokenA
        setTokenB(currentTokenA as any);

        // Then set tokenA to the new token
        setTimeout(() => {
          setTokenA(token as any);
        }, 0);

        console.log(
          "After switch: TokenA:",
          token.symbol,
          "TokenB:",
          currentTokenA.symbol
        );
      } else {
        // Otherwise just set the new token
        setTokenB(token as any);
      }
    },
    [tokenA, initialLoadComplete]
  );

  // Create stable amount change handlers
  const handleAmountAFromParams = useCallback((value: string) => {
    console.log(`Setting amountA from params: ${value}`);
    setAmountA(value);
  }, []);

  const handleAmountBFromParams = useCallback((value: string) => {
    console.log(`Setting amountB from params: ${value}`);
    setAmountB(value);
  }, []);

  // Use our new token resolver hook - it will handle query parameters
  const { source, isLoadingTokens } = useTokenResolver({
    initialTokens: allTokens as any,
    onTokenAChange: handleTokenAChange,
    onTokenBChange: handleTokenBChange,
    onAmountAChange: handleAmountAFromParams,
    onAmountBChange: handleAmountBFromParams,
  });

  // Check for URL parameters
  const checkForURLParams = useCallback(() => {
    return searchParamsHook.has("tokenA") || searchParamsHook.has("tokenB");
  }, [searchParamsHook]);

  // For non-URL tokens, handle the initialization
  useEffect(() => {
    const hasURLParams = checkForURLParams();

    // If no URL params and not initialized yet, mark as initialized
    // This should happen after a brief delay to let any token resolver logic finish
    if (!hasURLParams && !initialLoadComplete && !isLoadingTokens) {
      console.log("No URL params, marking initialization complete");
      setInitialLoadComplete(true);
    }
  }, [initialLoadComplete, isLoadingTokens, checkForURLParams]);

  // Add a useEffect to check for and correct duplicate tokens - only after initialization
  useEffect(() => {
    // Skip if we're still in the process of loading from URL params
    if (!initialLoadComplete) {
      return;
    }

    // Ensure tokens are different by comparing addresses
    if (
      tokenA &&
      tokenB &&
      tokenA.address &&
      tokenB.address &&
      tokenA.address.toLowerCase() === tokenB.address.toLowerCase()
    ) {
      console.log("Detected duplicate tokens in effect, correcting...");

      // Find an alternative token that's different
      const alternativeToken = allTokens.find(
        (t) => t.address.toLowerCase() !== tokenA.address.toLowerCase()
      );

      if (alternativeToken) {
        console.log("Setting alternative token:", alternativeToken.symbol);
        setTokenB(alternativeToken as any);
      }
    }
  }, [tokenA, tokenB, allTokens, initialLoadComplete]);

  // Slippage tolerance
  const [slippageTolerance, setSlippageTolerance] = useState("0.5");
  const [isAutoSlippage, setIsAutoSlippage] = useState(true);

  // Loading state
  const [isAddingLiquidity, setIsAddingLiquidity] = useState(false);

  // Use custom hook for pool-related logic
  const {
    poolExists,
    poolRatio,
    pairAddress,
    checkPoolExists,
    calculatePairedAmount,
    getDisplayRatio,
  } = usePoolManager(tokenA, tokenB);

  // Force check pool exists when tokens change, especially when navigating from other tabs
  useEffect(() => {
    if (tokenA && tokenB && tokenA.address && tokenB.address) {
      console.log("Forcing pool check on token change");
      checkPoolExists().catch(console.error);
    }
  }, [tokenA.address, tokenB.address, checkPoolExists]);

  // Get token balances using the WalletAssetsAdapter hook for consistency with swap page
  const {
    assets,
    isLoading: assetsLoading,
    refresh: refreshBalances,
  } = useWalletAssetsAdapter(smartWalletAddress, "monad-test-v2", {
    useZerion: false, // Only use Alchemy
    combineData: false, // Don't use combined data
  });

  // When assets are loaded for the first time, set initialLoading to false
  useEffect(() => {
    if (assets && assets.length > 0 && initialLoading) {
      setInitialLoading(false);
    }
  }, [assets, initialLoading]);

  // Balance loading state - show loading when assets are loading OR during initial load
  const balanceLoading = assetsLoading || initialLoading;

  // Combined loading state
  const isLoading = isAddingLiquidity || isLoadingTokens;

  // Handle amount changes with auto calculation for existing pools
  const handleAmountAChange = (value: string) => {
    console.log("handleAmountAChange called with value:", value);
    console.log("Current poolExists state:", poolExists);

    // Ensure we accept the value unconditionally
    setAmountA(value);

    // Only auto-calculate if pool definitely exists (not undefined or false)
    // And we have a valid numeric value to calculate with
    if (poolExists === true && poolRatio && isValidNumericInput(value)) {
      console.log("Auto-calculating token B amount based on pool ratio");
      setAmountB(calculatePairedAmount(value, tokenA, tokenB));
    }
  };

  const handleAmountBChange = (value: string) => {
    console.log("handleAmountBChange called with value:", value);
    console.log("Current poolExists state:", poolExists);

    // Ensure we accept the value unconditionally
    setAmountB(value);

    // Only auto-calculate if pool definitely exists (not undefined or false)
    // And we have a valid numeric value to calculate with
    if (poolExists === true && poolRatio && isValidNumericInput(value)) {
      console.log("Auto-calculating token A amount based on pool ratio");
      setAmountA(calculatePairedAmount(value, tokenB, tokenA));
    }
  };

  // Helper function to check if input is a valid number for calculations
  const isValidNumericInput = (value: string): boolean => {
    // Handle edge cases like "." or empty string
    if (value === "." || value === "") return false;

    // If it starts with a decimal, ethers.js will fail
    // Try parsing it as a float first to check validity
    try {
      const floatValue = parseFloat(value);
      return !isNaN(floatValue) && floatValue > 0;
    } catch (e) {
      return false;
    }
  };

  // New function: Get raw token balance without formatting (for numerical comparisons)
  const getTokenBalanceRaw = (token: SwapToken): number => {
    if (!assets) return 0;

    // Find the asset by address first (most accurate), then by symbol
    const asset = assets.find((asset) => {
      const implementation =
        asset.attributes.fungible_info?.implementations?.[0];
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
    });

    // Return the raw numeric value without formatting
    if (asset) {
      // Ensure we convert to number if it's a BigInt
      return Number(asset.attributes.quantity.float) || 0;
    }

    return 0;
  };

  // Get the relevant balance for the selected token (formatted for display)
  const getTokenBalance = (token: SwapToken): string => {
    // Get the raw balance first
    const rawBalance = getTokenBalanceRaw(token);

    // Return 0 if there's no balance
    if (rawBalance === 0) return "0";

    // Get the token decimals for proper formatting
    const tokenDecimals = token.decimals || (token.symbol === "USDC" ? 6 : 18);

    // Format the balance
    return formatTokenAmount(rawBalance, tokenDecimals);
  };

  // Calculate minimum amounts based on slippage tolerance
  const calculateMinAmount = (amount: string, decimals: number): string => {
    if (!amount || parseFloat(amount) === 0) return "0";

    console.log(
      `Calculating min amount for ${amount} with ${decimals} decimals`
    );
    const parsedAmount = ethers.parseUnits(amount, decimals);
    const slippageFactor = 1 - parseFloat(slippageTolerance) / 100;
    const minAmount =
      (parsedAmount * BigInt(Math.floor(slippageFactor * 10000))) /
      BigInt(10000);

    console.log(
      `Min amount result: ${minAmount.toString()} (${ethers.formatUnits(
        minAmount,
        decimals
      )})`
    );
    return minAmount.toString();
  };

  return (
    <div className="w-full max-w-md mx-auto bg-[#1B1B1F] rounded-2xl shadow-md p-6 text-white">
      <div className="mb-4">
        <h2 className="text-xl font-semibold">Add Liquidity</h2>
        <p className="text-sm text-gray-400 mt-1">
          Add liquidity to receive LP tokens
        </p>
      </div>

      {/* Pool exists indicator */}
      <PoolStatusCard
        poolExists={poolExists}
        tokenASymbol={tokenA.symbol}
        tokenBSymbol={tokenB.symbol}
        displayRatio={getDisplayRatio()}
      />

      {/* Fee - Just show the fixed fee */}
      <FeeDisplay fee={FIXED_FEE} />

      {/* First token input */}
      <TokenInputSection
        value={amountA}
        onChange={handleAmountAChange}
        token={tokenA}
        onTokenSelect={(token) => handleTokenAChange(token as any)}
        tokens={allTokens as any}
        balance={getTokenBalance(tokenA)}
        disabled={isLoading}
        balanceLoading={balanceLoading}
        tokenLoading={isLoadingTokens}
        showUsdValue={true}
        usdValue={
          amountA && parseFloat(amountA) > 0
            ? formatTokenAmount(
                parseFloat(amountA) *
                  (tokenA.symbol === "USDC"
                    ? 1
                    : tokenB.symbol === "USDC" &&
                      amountB &&
                      parseFloat(amountB) > 0
                    ? parseFloat(amountB) / parseFloat(amountA)
                    : 0),
                2
              )
            : "0"
        }
      />

      {/* Second token input */}
      <div className="mb-6">
        <TokenInputSection
          value={amountB}
          onChange={handleAmountBChange}
          token={tokenB}
          onTokenSelect={(token) => handleTokenBChange(token as any)}
          tokens={allTokens as any}
          balance={getTokenBalance(tokenB)}
          disabled={isLoading}
          secondaryDisabled={false}
          balanceLoading={balanceLoading}
          tokenLoading={isLoadingTokens}
          showUsdValue={true}
          usdValue={
            amountB && parseFloat(amountB) > 0
              ? formatTokenAmount(
                  parseFloat(amountB) *
                    (tokenB.symbol === "USDC"
                      ? 1
                      : tokenA.symbol === "USDC" &&
                        amountA &&
                        parseFloat(amountA) > 0
                      ? parseFloat(amountA) / parseFloat(amountB)
                      : 0),
                  2
                )
              : "0"
          }
        />
      </div>

      {/* Slippage settings */}
      <div className="mb-6">
        <SlippageSettings
          slippageTolerance={slippageTolerance}
          onChange={setSlippageTolerance}
          isAuto={isAutoSlippage}
          setIsAuto={setIsAutoSlippage}
        />
      </div>

      {/* Add liquidity button and error display */}
      <LiquidityActions
        user={user}
        tokenA={tokenA}
        tokenB={tokenB}
        amountA={amountA}
        amountB={amountB}
        slippageTolerance={slippageTolerance}
        poolExists={poolExists}
        poolRatio={poolRatio}
        pairAddress={pairAddress}
        isLoading={isLoading}
        checkPoolExists={checkPoolExists}
        setAmountA={setAmountA}
        setAmountB={setAmountB}
        getTokenBalance={getTokenBalance}
        getTokenBalanceRaw={getTokenBalanceRaw}
        calculateMinAmount={calculateMinAmount}
      />

      {/* Information card */}
      <InfoCard poolExists={poolExists} />
    </div>
  );
}

// Export the main component that wraps the content in Suspense
export function SwapPoolInterface() {
  return (
    <Suspense
      fallback={
        <div className="w-full max-w-md mx-auto bg-[#1B1B1F] rounded-2xl shadow-md p-6 text-white">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-700 rounded mb-4"></div>
            <div className="h-4 bg-gray-700 rounded w-3/4 mb-8"></div>
            <div className="h-24 bg-gray-700 rounded mb-4"></div>
            <div className="h-16 bg-gray-700 rounded mb-4"></div>
            <div className="h-16 bg-gray-700 rounded mb-4"></div>
            <div className="h-12 bg-gray-700 rounded"></div>
          </div>
        </div>
      }
    >
      <SwapPoolInterfaceContent />
    </Suspense>
  );
}
