"use client";

import React, { useState, useEffect, useCallback, Suspense } from "react";
import { ArrowDownIcon, ArrowsUpDownIcon } from "@heroicons/react/24/solid";
import { ethers } from "ethers";
import { usePrivy } from "@privy-io/react-auth";
import { TokenSelector } from "./TokenSelector";
import { AmountInput } from "./AmountInput";
import { TokenInputSection } from "./TokenInputSection";
import { useStageSwap } from "@/hooks/useStageSwap";
import { useWalletAssetsAdapter } from "@/hooks/useWalletAssetsAdapter";
import { useSmartWallet } from "@/hooks/useSmartWallet";
import { getDeadlineTimestamp } from "@/lib/contracts/StageSwap";
import showToast from "@/utils/toast";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { CONTRACT_ADDRESSES } from "@/lib/contracts/addresses";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import { useTokenList } from "@/hooks/useTokenList";
import { Token } from "@/types/token";
import { useSwapPriceImpact } from "@/hooks/useSwapPriceImpact";
import { SlippageSettings } from "./SlippageSettings";
import { useWrapUnwrap } from "@/hooks/useWrapUnwrap";
import { useSwapParams } from "@/hooks/useSwapParams";
import { useAuthJwt } from "@/hooks/useAuthJwt";
import { useSwapMissions } from "@/hooks/useSwapMissions";
import {
  getTokenBalanceFormatted,
  getTokenBalanceRaw,
  getTokenBalanceWei,
} from "@/utils/tokenBalance";

// Get the WMON address from the contracts file
const WMON_ADDRESS = CONTRACT_ADDRESSES.monadTestnet.officialWmon;
console.log("Using official WMON address:", WMON_ADDRESS);

// Adding formatTokenAmount function based on WalletAssets.tsx
const formatTokenAmount = (quantity: number, decimals: number = 4): string => {
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

// Format long input values to maximum 8 decimal places for display
const formatInputDisplay = (value: string): string => {
  if (value.includes(".")) {
    const parts = value.split(".");
    if (parts[1] && parts[1].length > 8) {
      return `${parts[0]}.${parts[1].substring(0, 8)}`;
    }
  }
  return value;
};

// Create a token data array with real contract addresses
// Note: We're keeping this for backward compatibility but using useTokenList instead
const TOKENS = [
  {
    address: CONTRACT_ADDRESSES.monadTestnet.usdc,
    symbol: "USDC",
    name: "USD Coin",
    decimals: 6,
    logoURI: "/icons/usdc-logo.svg",
  },
  {
    address: "NATIVE", // Special marker for native MON
    symbol: "MON",
    name: "Monad",
    decimals: 18,
    logoURI: "/icons/mon-logo.svg",
  },
  {
    address: WMON_ADDRESS, // Use WMON address from constants
    symbol: "WMON",
    name: "Wrapped MON",
    decimals: 18,
    logoURI: "/icons/mon-logo.svg",
  },
];

// Define a constant for the high price impact threshold
const HIGH_PRICE_IMPACT_THRESHOLD = 15; // 15%

// Internal component with all the logic
function SwapInterfaceContent() {
  const { user } = usePrivy();
  const { verifySwapByTokens } = useSwapMissions();

  // Add console error handler to filter out specific error messages
  useEffect(() => {
    // Store the original console.error
    const originalConsoleError = console.error;

    // Override console.error with rest parameters
    console.error = function (...args) {
      // Convert arguments to string to check for specific errors
      const errorString = args.join(" ");

      // Check if this is a missing pool error
      if (
        errorString.includes("missing revert data") ||
        errorString.includes("CALL_EXCEPTION")
      ) {
        // Replace with a less alarming log for missing pools
        console.log("Swap pool does not exist for this pair");
        return;
      }

      // For all other errors, call the original console.error with proper typing
      originalConsoleError.apply(console, args);
    };

    // Clean up when component unmounts
    return () => {
      console.error = originalConsoleError;
    };
  }, []);

  // Use token list hook with onlyWithLiquidity = true for swap
  // And onlyMainTokens = true to only show MON, WMON, and USDC
  const { allTokens, isLoading: isTokensLoading } = useTokenList({
    onlyWithLiquidity: false, // Include tokens without liquidity
    onlyMainTokens: false, // Include all tokens, not just main ones
  });

  // Get callContractFunction and smartWalletAddress from useSmartWallet for direct WMON operations
  const { smartWalletAddress, callContractFunction } = useSmartWallet();

  // Set default tokens from the loaded list when available
  const [inputToken, setInputToken] = useState<Token | null>(null);
  const [outputToken, setOutputToken] = useState<Token | null>(null);
  const [inputAmount, setInputAmount] = useState("");
  const [outputAmount, setOutputAmount] = useState("");
  const [isExactIn, setIsExactIn] = useState(true);
  const [isSwapping, setIsSwapping] = useState(false);

  // Add slippage tolerance state - set Auto mode as default
  const [slippageTolerance, setSlippageTolerance] = useState("0.5");
  const [isAutoSlippage, setIsAutoSlippage] = useState(true);

  // Add a new state for no pool error
  const [noPoolExists, setNoPoolExists] = useState(false);

  // Calculate actual slippage value
  const actualSlippageValue = isAutoSlippage
    ? 0.005
    : parseFloat(slippageTolerance) / 100;

  // Create wrapper functions for token selection that implement auto-switching
  const handleInputTokenSelect = (token: Token) => {
    // If user selects the same token that's already in the output field
    if (outputToken && token.address === outputToken.address) {
      // Swap them - put the previous input token in the output field
      setOutputToken(inputToken);
    }
    // Set the new input token
    setInputToken(token);
  };

  const handleOutputTokenSelect = (token: Token) => {
    // If user selects the same token that's already in the input field
    if (inputToken && token.address === inputToken.address) {
      // Swap them - put the previous output token in the input field
      setInputToken(outputToken);
    }
    // Set the new output token
    setOutputToken(token);
  };

  // Use the price impact hook for price impact calculations
  const {
    priceImpact,
    isPriceImpactTooHigh,
    minimumReceived,
    lowLiquidityMessage,
    isSwapLikelyInvalid,
    isCalculating,
  } = useSwapPriceImpact({
    inputAmount,
    outputAmount,
    inputToken,
    outputToken,
    slippageTolerance: actualSlippageValue,
  });

  // Use the swap params hook to handle URL query parameters for tokens
  const { isLoadingTokens: isLoadingParamTokens, tokensSetFromUrl } =
    useSwapParams({
      allTokens,
      onInputTokenChange: handleInputTokenSelect,
      onOutputTokenChange: handleOutputTokenSelect,
    });

  // Track if tokens have been initialized from URL or defaults
  const [tokensInitialized, setTokensInitialized] = useState(false);

  // Initialize tokens when allTokens are loaded (only if not already set from URL params)
  useEffect(() => {
    // Skip if already initialized or no tokens available
    if (tokensInitialized || allTokens.length === 0) {
      return;
    }

    // If tokens were set from URL, mark as initialized and don't set defaults
    if (tokensSetFromUrl) {
      console.log("Tokens set from URL, not setting defaults");
      setTokensInitialized(true);
      return;
    }

    // If tokens are already set (from some other source), mark as initialized
    if (inputToken && outputToken) {
      console.log("Tokens already set, marking as initialized");
      setTokensInitialized(true);
      return;
    }

    // If we have tokens but they aren't set yet, set defaults
    if (allTokens.length > 0 && !inputToken && !outputToken) {
      // Check URL parameters first before setting defaults
      const urlParams = new URLSearchParams(window.location.search);
      const hasUrlTokenParams =
        urlParams.has("inputToken") || urlParams.has("outputToken");

      // Skip setting defaults if URL parameters exist for tokens
      if (hasUrlTokenParams) {
        console.log(
          "URL contains token parameters, skipping default token setup"
        );
        setTokensInitialized(true);
        return;
      }

      console.log("Setting default tokens");
      // Find USDC by address and MON from loaded tokens
      const usdc = allTokens.find(
        (t) =>
          t.address.toLowerCase() ===
          CONTRACT_ADDRESSES.monadTestnet.usdc.toLowerCase()
      );
      const mon = allTokens.find((t) => t.symbol === "MON");

      // Set default input token to USDC and output token to MON
      if (usdc) setInputToken(usdc);
      if (mon) setOutputToken(mon);
      setTokensInitialized(true);
    }
  }, [allTokens, inputToken, outputToken, tokensInitialized, tokensSetFromUrl]);

  // Set a loading state for initial render
  const [initialLoading, setInitialLoading] = useState(true);

  // Replace useWalletAssets with useWalletAssetsAdapter
  const {
    assets,
    refresh: refreshBalances,
    isLoading: assetsLoading,
  } = useWalletAssetsAdapter(smartWalletAddress, "monad-test-v2", {
    useZerion: false, // Only use Alchemy
    combineData: false, // Don't use combined data
  });

  // Get hooks for swap and wrap/unwrap operations
  const {
    swapExactTokensForTokens,
    getAmountsOut,
    isLoading: isSwapHookLoading,
    error,
    swapExactETHForTokens,
    swapExactTokensForETH,
  } = useStageSwap();

  const {
    wrapMon,
    unwrapWmon,
    isLoading: isWrapUnwrapLoading,
  } = useWrapUnwrap();

  // When assets are loaded for the first time, set initialLoading to false
  useEffect(() => {
    if (assets && assets.length > 0 && initialLoading) {
      setInitialLoading(false);
    }
  }, [assets, initialLoading]);

  // Combined loading state - include the new param tokens loading state
  const isLoading =
    isSwapping ||
    isSwapHookLoading ||
    isTokensLoading ||
    isWrapUnwrapLoading ||
    isLoadingParamTokens;

  // Balance loading state - show loading when assets are loading OR during initial load
  const balanceLoading = assetsLoading || initialLoading;

  // Check if we have any real balance values (not just zeros)
  const hasRealBalances = React.useMemo(() => {
    if (!assets || assets.length === 0) return false;

    // Check if we have any non-zero balances
    return assets.some(
      (asset) =>
        parseFloat(asset.attributes.quantity?.float?.toString() || "0") > 0
    );
  }, [assets]);

  // Helper function to get the appropriate balance based on token using Zerion assets
  const getTokenBalance = (token: Token): string => {
    return getTokenBalanceFormatted(token, assets || []);
  };

  // Function to swap the input and output tokens
  const handleSwapTokens = () => {
    if (!inputToken || !outputToken) return;

    setInputToken(outputToken);
    setOutputToken(inputToken);
    setInputAmount(outputAmount);
    setOutputAmount(inputAmount);
    setIsExactIn(!isExactIn);
  };

  // Update the getQuote function to handle missing pool errors
  useEffect(() => {
    const getQuote = async () => {
      // Reset no pool error state at the start of each quote attempt
      setNoPoolExists(false);

      // Validate inputAmount before proceeding
      const parsedInputAmount = parseFloat(inputAmount);
      if (
        !inputAmount ||
        isNaN(parsedInputAmount) ||
        parsedInputAmount <= 0 ||
        !inputToken ||
        !outputToken
      ) {
        setOutputAmount("");
        return;
      }
      // At this point, inputAmount is a string representing a positive number,
      // and parsedInputAmount is its float value.

      // Check if this is a MON <-> WMON direct conversion
      const isInputNative = inputToken.address === "NATIVE";
      const isOutputNative = outputToken.address === "NATIVE";
      const isWmonToMon = isOutputNative && inputToken.address === WMON_ADDRESS;
      const isMonToWmon = isInputNative && outputToken.address === WMON_ADDRESS;

      // For MON <-> WMON pairs, use 1:1 ratio and skip router call
      if (isWmonToMon || isMonToWmon) {
        console.log("MON <-> WMON direct conversion detected, using 1:1 ratio");
        setOutputAmount(inputAmount);
        return;
      }

      try {
        // Common path and address setup
        const adjustedInputAddress = isInputNative
          ? WMON_ADDRESS
          : inputToken.address;
        const adjustedOutputAddress = isOutputNative
          ? WMON_ADDRESS
          : outputToken.address;
        const path = [adjustedInputAddress, adjustedOutputAddress];

        // Ensure proper formatting to avoid the "too many decimals" error
        // Format the input amount based on the token's decimals
        // We need to ensure the number doesn't have more decimal places than the token supports
        let formattedInput = inputAmount;

        // If the input contains a decimal, ensure it doesn't exceed the token's decimal places
        if (inputAmount.includes(".")) {
          const parts = inputAmount.split(".");
          // If the decimal part is longer than the token's decimals, truncate it
          if (parts[1].length > inputToken.decimals) {
            formattedInput = `${parts[0]}.${parts[1].substring(
              0,
              inputToken.decimals
            )}`;
          }
        }

        // Convert formatted input to Wei
        const amountInWei = ethers
          .parseUnits(formattedInput, inputToken.decimals)
          .toString();

        const actualQuoteResult = await getAmountsOut({
          amountIn: amountInWei,
          path: path,
        });

        if (
          actualQuoteResult.success &&
          actualQuoteResult.amounts &&
          actualQuoteResult.amounts.length >= 2
        ) {
          const actualOutputAmountInWei = actualQuoteResult.amounts[1];
          const formattedActualOutput = ethers.formatUnits(
            actualOutputAmountInWei,
            outputToken.decimals
          );

          // Set the output amount - price impact calculation happens in the hook
          setOutputAmount(formattedActualOutput);
        } else {
          // actualQuoteResult failed
          setOutputAmount("");
          if (actualQuoteResult.error) {
            // Check for missing pool errors first before logging to console
            if (
              typeof actualQuoteResult.error === "string" &&
              (actualQuoteResult.error.includes("missing revert data") ||
                actualQuoteResult.error.includes("CALL_EXCEPTION"))
            ) {
              // Silently handle this expected case
              console.log("No pool exists for this pair");
              setNoPoolExists(true);
              setOutputAmount("");
              return;
            }

            // Only log unexpected errors
            console.error("Error getting quote:", actualQuoteResult.error);
            setOutputAmount("");

            // Display appropriate error message
            if (
              typeof actualQuoteResult.error === "string" &&
              actualQuoteResult.error.includes("too many decimals")
            ) {
              showToast.error(
                "The amount has too many decimal places. Please adjust the input amount."
              );
            } else {
              showToast.error(
                typeof actualQuoteResult.error === "string"
                  ? actualQuoteResult.error
                  : "Failed to get quote for the specified amount."
              );
            }
          } else {
            console.error("Error getting quote:", actualQuoteResult.error);
            setOutputAmount("");
            showToast.error("Error calculating quote.");
          }
        }
      } catch (error) {
        // Check for missing pool errors first before logging to console
        if (error instanceof Error) {
          const errorMessage = error.message;
          if (
            errorMessage.includes("missing revert data") ||
            errorMessage.includes("CALL_EXCEPTION")
          ) {
            // Silently handle this expected case
            console.log("No pool exists for this pair");
            setNoPoolExists(true);
            setOutputAmount("");
            return;
          }

          // Only log unexpected errors
          console.error("Error getting quote:", error);
          setOutputAmount("");

          // Check specifically for the "too many decimals" error
          if (errorMessage.includes("too many decimals")) {
            showToast.error(
              "The amount has too many decimal places. Please adjust the input amount."
            );
          } else {
            showToast.error(errorMessage);
          }
        } else {
          console.error("Error getting quote:", error);
          setOutputAmount("");
          showToast.error("Error calculating quote.");
        }
      }
    };

    getQuote();
  }, [inputAmount, inputToken, outputToken, getAmountsOut]);

  // Calculate minimum output amount using the current slippage tolerance
  const getMinimumOutputAmount = () => {
    if (!outputAmount || parseFloat(outputAmount) === 0 || !outputToken) {
      return "0";
    }

    const slippageFactor = isAutoSlippage
      ? 0.995
      : 1 - parseFloat(slippageTolerance) / 100;

    // Calculate the minimum amount with slippage applied
    const minAmount = parseFloat(outputAmount) * slippageFactor;

    // Format to the appropriate number of decimals for the token
    // Use at most the token's decimals (capped at 8 to be safe)
    const maxDecimals = Math.min(outputToken.decimals, 8);
    const result = minAmount.toFixed(maxDecimals);

    // Format the display for UI
    return formatInputDisplay(result);
  };

  // Handle swap
  const handleSwap = async () => {
    if (!user) {
      showToast.error("Please log in first");
      return;
    }

    if (!inputAmount || parseFloat(inputAmount) === 0) {
      showToast.error("Please enter an amount");
      return;
    }

    if (!inputToken || !outputToken) {
      showToast.error("Please select tokens");
      return;
    }

    if (inputToken.address === outputToken.address) {
      showToast.error("Cannot swap the same token");
      return;
    }

    // Check for high price impact before proceeding
    if (isPriceImpactTooHigh) {
      showToast.error(
        `Swap aborted: Price impact is too high. Maximum allowed is ${HIGH_PRICE_IMPACT_THRESHOLD}%.`
      );
      return;
    }

    setIsSwapping(true);

    try {
      console.log("Swapping tokens:", {
        inputToken: inputToken.symbol,
        inputDecimals: inputToken.decimals,
        outputToken: outputToken.symbol,
        outputDecimals: outputToken.decimals,
        inputAddress: inputToken.address,
        outputAddress: outputToken.address,
        inputAmount,
        outputAmount,
      });

      // Convert amounts to wei
      const amountInWei = ethers
        .parseUnits(inputAmount, inputToken.decimals)
        .toString();

      // Set a minimum output amount with slippage tolerance
      const minOutputAmount = ethers
        .parseUnits(getMinimumOutputAmount(), outputToken.decimals)
        .toString();

      // Set deadline to 20 minutes from now
      const deadline = getDeadlineTimestamp(20);

      // Check if we're using native MON
      const isInputNative = inputToken.address === "NATIVE";
      const isOutputNative = outputToken.address === "NATIVE";

      console.log("Swap details:", {
        isInputNative,
        isOutputNative,
        inputToken: inputToken.symbol,
        outputToken: outputToken.symbol,
        inputAddress: inputToken.address,
        outputAddress: outputToken.address,
        WMON_ADDRESS,
      });

      // Define swapResult with explicit type
      let swapResult: { success: boolean; error?: string; txHash?: string } = {
        success: false,
        error: "Swap not executed",
      };

      // Special case for MON <-> WMON direct wrapping/unwrapping
      if (
        (isInputNative && outputToken.address === WMON_ADDRESS) ||
        (isOutputNative && inputToken.address === WMON_ADDRESS)
      ) {
        // Make sure we have the smart wallet functions
        if (!callContractFunction) {
          showToast.error("Smart wallet functions not available");
          setIsSwapping(false);
          return;
        }

        // Handle direct MON to WMON wrapping
        if (isInputNative && outputToken.address === WMON_ADDRESS) {
          console.log("Direct wrapping MON to WMON...");

          try {
            // Use the new hook for wrapping
            swapResult = await wrapMon(amountInWei);

            console.log("MON to WMON wrap result:", swapResult);
          } catch (wrapError) {
            console.error("Error in MON wrapping:", wrapError);
            swapResult = {
              success: false,
              error:
                wrapError instanceof Error
                  ? wrapError.message
                  : "Unknown error during wrapping",
            };
          }
        }
        // Handle direct WMON to MON unwrapping
        else if (isOutputNative && inputToken.address === WMON_ADDRESS) {
          console.log("Direct unwrapping WMON to MON...");

          // Get the WMON balance of the user first - use the utility function
          const wmonBalanceInWei = getTokenBalanceWei(inputToken, assets || []);
          console.log(`User WMON balance in Wei: ${wmonBalanceInWei}`);

          try {
            // Use the new hook for unwrapping
            swapResult = await unwrapWmon(amountInWei, wmonBalanceInWei);

            console.log("WMON to MON unwrap result:", swapResult);
          } catch (unwrapError) {
            console.error("Error in WMON unwrapping:", unwrapError);
            swapResult = {
              success: false,
              error:
                unwrapError instanceof Error
                  ? unwrapError.message
                  : "Unknown error during unwrapping",
            };
          }
        }
      }
      // Standard swap path for other token pairs
      else if (isInputNative) {
        // Case 1: Swapping native MON to token (e.g., MON -> USDC)
        console.log("Swapping native MON to token...");

        // We'll use swapExactETHForTokens - create the path with WMON at the start
        const path = [WMON_ADDRESS, outputToken.address];
        console.log("Swap path:", path);

        // Since we're sending MON natively, we need to use swapExactETHForTokens
        swapResult = await swapExactETHForTokens({
          amountOutMin: minOutputAmount,
          path: path,
          to: "", // Will be filled in by the hook
          deadline: deadline,
          value: amountInWei, // Send the MON amount as value
        });

        console.log("Native MON to token swap result:", swapResult);
      } else if (isOutputNative) {
        // Case 2: Swapping token to native MON (e.g., USDC -> MON)
        console.log("Swapping token to native MON...");

        // We'll use swapExactTokensForETH - create the path with WMON at the end
        const path = [inputToken.address, WMON_ADDRESS];
        console.log("Swap path:", path);

        swapResult = await swapExactTokensForETH({
          amountIn: amountInWei,
          amountOutMin: minOutputAmount,
          path: path,
          to: "", // Will be filled in by the hook
          deadline: deadline,
        });

        console.log("Token to native MON swap result:", swapResult);
      } else {
        // Case 3: Regular token to token swap (e.g., USDC -> WMON)
        console.log("Regular token to token swap");

        // Use the standard swapExactTokensForTokens
        swapResult = await swapExactTokensForTokens({
          amountIn: amountInWei,
          amountOutMin: minOutputAmount,
          path: [inputToken.address, outputToken.address],
          to: "", // Will be replaced with smart wallet address in the hook
          deadline,
        });

        console.log("Token to token swap result:", swapResult);
      }

      if (swapResult.success) {
        // Reset input fields
        setInputAmount("");
        setOutputAmount("");
        // Refresh user's balance
        refreshBalances();

        // Automatically check for swap missions
        if (swapResult.txHash) {
          try {
            await verifySwapByTokens(
              inputToken.address,
              outputToken.address,
              swapResult.txHash
            );
          } catch (error) {
            console.error("Error checking swap mission:", error);
            // Non-critical error, don't show to user
          }
        }
      } else {
        showToast.error(swapResult.error || "Swap failed");
      }
    } catch (error) {
      console.error("Error during swap:", error);
      showToast.error(error instanceof Error ? error.message : "Swap failed");
    } finally {
      setIsSwapping(false);
    }
  };

  return (
    <div className="p-6 bg-[#1B1B1F] rounded-2xl shadow-lg max-w-md mx-auto text-white">
      {/* Only render TokenInputSection if tokens are selected */}
      {inputToken && (
        <TokenInputSection
          tagLabel="Selling"
          value={formatInputDisplay(inputAmount)}
          onChange={setInputAmount}
          token={inputToken}
          onTokenSelect={handleInputTokenSelect}
          tokens={allTokens}
          balance={getTokenBalance(inputToken)}
          disabled={isLoading}
          disableInput={noPoolExists}
          balanceLoading={balanceLoading}
          tokenLoading={isTokensLoading}
          showUsdValue={true}
          usdValue={
            inputAmount && parseFloat(inputAmount) > 0
              ? formatTokenAmount(
                  parseFloat(inputAmount) *
                    (inputToken.symbol === "USDC"
                      ? 1
                      : outputToken &&
                        outputToken.symbol === "USDC" &&
                        outputAmount
                      ? parseFloat(outputAmount) / parseFloat(inputAmount)
                      : 0),
                  2
                )
              : "0"
          }
        />
      )}

      {/* Swap button */}
      <div className="flex justify-center my-1">
        <button
          onClick={handleSwapTokens}
          className="bg-gray-700 hover:bg-gray-600 rounded-full p-2"
          disabled={isLoading}
        >
          <ArrowsUpDownIcon className="h-5 w-5 text-gray-300" />
        </button>
      </div>

      {/* Only render output TokenInputSection if tokens are selected */}
      {outputToken && (
        <TokenInputSection
          tagLabel="Buying"
          value={formatInputDisplay(outputAmount)}
          onChange={() => {}} // Read-only for output in exactIn mode
          token={outputToken}
          onTokenSelect={handleOutputTokenSelect}
          tokens={allTokens}
          balance={getTokenBalance(outputToken)}
          disabled={isLoading}
          disableInput={true} // Always disable output input field in exactIn mode
          balanceLoading={balanceLoading}
          tokenLoading={isTokensLoading}
          showUsdValue={true}
          usdValue={
            outputAmount && parseFloat(outputAmount) > 0
              ? formatTokenAmount(
                  parseFloat(outputAmount) *
                    (outputToken.symbol === "USDC"
                      ? 1
                      : inputToken &&
                        inputToken.symbol === "USDC" &&
                        inputAmount
                      ? parseFloat(inputAmount) / parseFloat(outputAmount)
                      : 0),
                  2
                )
              : "0"
          }
          hideBuyingControls={true} // Hide percentage controls for the "Buying" section
        />
      )}

      {/* Slippage settings at bottom left */}
      <div className="flex justify-start mt-3 mb-3">
        <SlippageSettings
          slippageTolerance={slippageTolerance}
          onChange={setSlippageTolerance}
          isAuto={isAutoSlippage}
          setIsAuto={setIsAutoSlippage}
        />
      </div>

      {/* Price info */}
      {inputToken && outputToken && inputAmount && (
        <div className="mt-2 mb-6 p-3 rounded-lg text-sm">
          {/* Only show price if we have output amount and no pool error */}
          {outputAmount && parseFloat(outputAmount) > 0 && !noPoolExists && (
            <div className="flex justify-between">
              <span className="text-gray-400">Price</span>
              <span>
                1 {inputToken.symbol} ={" "}
                {formatTokenAmount(
                  parseFloat(outputAmount) / parseFloat(inputAmount),
                  6
                )}{" "}
                {outputToken.symbol}
              </span>
            </div>
          )}

          {/* Display Price Impact or N/A message - only if we have an output and no pool error */}
          {priceImpact !== null &&
            !isCalculating &&
            !noPoolExists &&
            outputAmount && (
              <div className="flex justify-between mt-1">
                <span className="text-gray-400">Price Impact</span>
                <span
                  className={`${
                    parseFloat(priceImpact) > 5 // Still color if it's a high number, even if not blocking
                      ? "text-red-500"
                      : "text-gray-300"
                  }`}
                >
                  {/* Always show 0% for MON/WMON pairs */}
                  {(inputToken.address === "NATIVE" &&
                    outputToken.address === WMON_ADDRESS) ||
                  (outputToken.address === "NATIVE" &&
                    inputToken.address === WMON_ADDRESS)
                    ? "0.00%" // Hardcoded 0% for MON/WMON pairs
                    : priceImpact + "%"}
                </span>
              </div>
            )}
          {/* Loading skeleton for price impact - only if not no pool error */}
          {isCalculating && !noPoolExists && (
            <div className="flex justify-between mt-1">
              <span className="text-gray-400">Price Impact</span>
              <div className="w-16 h-4 bg-gray-700 rounded animate-pulse"></div>
            </div>
          )}
          {priceImpact === null &&
            !isCalculating &&
            !noPoolExists &&
            outputAmount &&
            parseFloat(outputAmount) > 0 && (
              <div className="flex justify-between mt-1">
                <span className="text-gray-400">Price Impact</span>
                <span className="text-gray-300">N/A</span>
              </div>
            )}
          {/* Display Minimum Received - only if we have an output and no pool error */}
          {minimumReceived && outputToken && !noPoolExists && (
            <div className="flex justify-between mt-1">
              <span className="text-gray-400">Minimum Received</span>
              <span className="text-gray-300">
                {/* For MON/WMON pairs, minimum received is exactly 1:1 */}
                {(inputToken.address === "NATIVE" &&
                  outputToken.address === WMON_ADDRESS) ||
                (outputToken.address === "NATIVE" &&
                  inputToken.address === WMON_ADDRESS)
                  ? formatInputDisplay(inputAmount) // Exact 1:1 conversion, but format display
                  : formatInputDisplay(minimumReceived)}{" "}
                {outputToken.symbol}
              </span>
            </div>
          )}
          {/* Display Low Liquidity Message - only if not no pool error */}
          {lowLiquidityMessage &&
            !noPoolExists &&
            !(
              inputToken.address === "NATIVE" &&
              outputToken.address === WMON_ADDRESS
            ) &&
            !(
              outputToken.address === "NATIVE" &&
              inputToken.address === WMON_ADDRESS
            ) && (
              <div className="mt-2 text-xs text-yellow-400/80 text-center">
                {lowLiquidityMessage}
              </div>
            )}
        </div>
      )}

      {/* Swap button - update to improve disabled styling */}
      <div className="mt-6">
        <PrimaryButton
          onClick={handleSwap}
          disabled={
            isLoading ||
            !inputToken ||
            !outputToken ||
            !inputAmount ||
            parseFloat(inputAmount) === 0 ||
            isPriceImpactTooHigh ||
            isSwapLikelyInvalid ||
            noPoolExists
          }
          className={`w-full py-3 text-lg font-semibold ${
            isLoading ||
            !inputToken ||
            !outputToken ||
            !inputAmount ||
            parseFloat(inputAmount) === 0 ||
            isPriceImpactTooHigh ||
            isSwapLikelyInvalid ||
            noPoolExists
              ? "opacity-50 cursor-not-allowed"
              : ""
          }`}
        >
          {isSwapLikelyInvalid
            ? "Amount Error / No Output"
            : isPriceImpactTooHigh
            ? "Price Impact Too High"
            : noPoolExists
            ? "No Pool Liquidity"
            : isSwapping
            ? "Swapping..."
            : "Swap"}
        </PrimaryButton>
      </div>

      {/* Error message */}
      {error && (
        <div className="mt-4 p-3 bg-red-900/30 text-red-400 rounded-lg text-sm">
          {error}
        </div>
      )}

      {/* Loading message for tokens */}
      {isTokensLoading && (
        <div className="mt-4 text-center text-sm text-gray-400">
          Loading available tokens...
        </div>
      )}
    </div>
  );
}

// Export the main component that wraps the content in Suspense
export function SwapInterface() {
  return (
    <Suspense
      fallback={
        <div className="w-full max-w-md mx-auto bg-[#1B1B1F] rounded-2xl shadow-md p-6 text-white">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-700 rounded mb-4"></div>
            <div className="h-4 bg-gray-700 rounded w-3/4 mb-8"></div>
            <div className="h-24 bg-gray-700 rounded mb-4"></div>
            <div className="h-16 bg-gray-700 rounded mb-4"></div>
            <div className="h-12 bg-gray-700 rounded"></div>
          </div>
        </div>
      }
    >
      <SwapInterfaceContent />
    </Suspense>
  );
}
