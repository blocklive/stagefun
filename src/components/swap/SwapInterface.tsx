import React, { useState, useEffect, useCallback } from "react";
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

// Get the WMON address from the contracts file
const WMON_ADDRESS = CONTRACT_ADDRESSES.monadTestnet.officialWmon;
console.log("Using official WMON address:", WMON_ADDRESS);

// Create a detailed WMON contract interface exactly matching the contract
const WMON_ABI = [
  // Basic ERC20 functions
  "function balanceOf(address) view returns (uint256)",
  "function allowance(address, address) view returns (uint256)",
  "function approve(address, uint256) returns (bool)",
  "function transfer(address, uint256) returns (bool)",
  "function transferFrom(address, address, uint256) returns (bool)",
  // WMON specific functions
  "function deposit() payable",
  "function withdraw(uint256)",
];

// Adding formatTokenAmount function based on WalletAssets.tsx
const formatTokenAmount = (quantity: number, decimals: number = 4): string => {
  // For very small numbers, use scientific notation below a certain threshold
  if (quantity > 0 && quantity < 0.000001) {
    return quantity.toExponential(6);
  }

  // Otherwise use regular formatting with appropriate decimals
  const maxDecimals = Math.min(decimals, 6);

  return quantity.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: maxDecimals,
  });
};

// Token data with real contract addresses
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

export function SwapInterface() {
  const { user } = usePrivy();
  // Use token list hook with onlyWithLiquidity = true for swap
  // And onlyMainTokens = true to only show MON, WMON, and USDC
  const { allTokens, isLoading: isTokensLoading } = useTokenList({
    onlyWithLiquidity: true,
    onlyMainTokens: true,
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
  } = useSwapPriceImpact({
    inputAmount,
    outputAmount,
    inputToken,
    outputToken,
  });

  // Initialize tokens when allTokens are loaded
  useEffect(() => {
    if (allTokens.length > 0 && !inputToken && !outputToken) {
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
    }
  }, [allTokens, inputToken, outputToken]);

  const {
    swapExactTokensForTokens,
    getAmountsOut,
    isLoading: isSwapHookLoading,
    error,
    swapExactETHForTokens,
    swapExactTokensForETH,
  } = useStageSwap();

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

  // When assets are loaded for the first time, set initialLoading to false
  useEffect(() => {
    if (assets && assets.length > 0 && initialLoading) {
      setInitialLoading(false);
    }
  }, [assets, initialLoading]);

  // Combined loading state
  const isLoading = isSwapping || isSwapHookLoading || isTokensLoading;

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
    if (!assets) return "0";

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

      // Match by symbol as fallback (but NOT for USDC or WMON)
      return (
        symbol === token.symbol &&
        token.symbol !== "USDC" &&
        token.symbol !== "WMON"
      );
    });

    // Format the balance using formatTokenAmount instead of formatAmount
    if (asset) {
      const quantity = asset.attributes.quantity.float;
      const tokenDecimals =
        asset.attributes.quantity.decimals ||
        asset.attributes.fungible_info?.implementations?.[0]?.decimals ||
        (token.symbol === "USDC" ? 6 : 18);
      return formatTokenAmount(quantity, tokenDecimals);
    }

    return "0";
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

  // Get quote when input amount or tokens change
  useEffect(() => {
    const getQuote = async () => {
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

        // Get Actual Output for User's Input Amount
        const amountInWei = ethers
          .parseUnits(inputAmount, inputToken.decimals)
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
            showToast.error(
              actualQuoteResult.error ||
                "Failed to get quote for the specified amount."
            );
          } else {
            showToast.error("Failed to get quote for the specified amount.");
          }
        }
      } catch (error) {
        console.error("Error getting quote:", error);
        setOutputAmount("");
        showToast.error(
          error instanceof Error ? error.message : "Error calculating quote."
        );
      }
    };

    getQuote();
  }, [inputAmount, inputToken, outputToken, getAmountsOut]);

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
        outputToken: outputToken.symbol,
        inputAddress: inputToken.address,
        outputAddress: outputToken.address,
        inputAmount,
        outputAmount,
      });

      // Convert amounts to wei
      const amountInWei = ethers
        .parseUnits(inputAmount, inputToken.decimals)
        .toString();

      // Set a minimum output amount with 0.5% slippage
      const minOutputAmount = ethers
        .parseUnits(
          (parseFloat(outputAmount) * 0.995).toFixed(outputToken.decimals),
          outputToken.decimals
        )
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
            const amountBigInt = BigInt(amountInWei);
            console.log(
              `Wrapping ${amountBigInt.toString()} MON to WMON with detailed contract interface`
            );
            console.log(`WMON address: ${WMON_ADDRESS}`);

            // Call deposit with MON value
            swapResult = await callContractFunction(
              WMON_ADDRESS as `0x${string}`,
              WMON_ABI,
              "deposit",
              [], // no arguments needed
              "Wrap MON to WMON",
              { value: amountBigInt } // Send the MON as value
            );

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

          // Get the WMON balance of the user first
          const wmonBalanceInWei = getTokenBalance(inputToken);
          console.log(`User WMON balance: ${wmonBalanceInWei}`);

          // Convert the balance to a number for comparison
          const wmonBalance = parseFloat(wmonBalanceInWei);
          const requestedAmount = parseFloat(inputAmount);

          // Check if the user has enough WMON
          if (wmonBalance < requestedAmount) {
            swapResult = {
              success: false,
              error: `Insufficient WMON balance. You have ${wmonBalanceInWei} WMON but are trying to unwrap ${inputAmount} WMON.`,
            };
            console.log(
              "WMON unwrap failed due to insufficient balance:",
              swapResult
            );
          } else {
            try {
              // Using ethers.js to format the number correctly
              const amountBigInt = BigInt(amountInWei);

              console.log(
                `Unwrapping ${amountBigInt.toString()} WMON to MON with detailed contract interface`
              );
              console.log(`WMON address: ${WMON_ADDRESS}`);

              // Call withdraw with the exact parameter type from the contract
              swapResult = await callContractFunction(
                WMON_ADDRESS as `0x${string}`,
                WMON_ABI,
                "withdraw",
                [amountBigInt],
                "Unwrap WMON to MON"
              );

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
    <div className="p-4 bg-[#1B1B1F] rounded-lg shadow-lg max-w-md mx-auto text-white">
      <h2 className="text-2xl font-bold mb-6">Swap</h2>

      {/* Only render TokenInputSection if tokens are selected */}
      {inputToken && (
        <TokenInputSection
          label="From"
          value={inputAmount}
          onChange={setInputAmount}
          token={inputToken}
          onTokenSelect={handleInputTokenSelect}
          tokens={allTokens}
          balance={getTokenBalance(inputToken)}
          disabled={isLoading}
          balanceLoading={balanceLoading}
          tokenLoading={isTokensLoading}
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
          label="To"
          value={outputAmount}
          onChange={() => {}} // Read-only for output in exactIn mode
          token={outputToken}
          onTokenSelect={handleOutputTokenSelect}
          tokens={allTokens}
          balance={getTokenBalance(outputToken)}
          disabled={isLoading}
          balanceLoading={balanceLoading}
          tokenLoading={isTokensLoading}
        />
      )}

      {/* Price info */}
      {inputToken && outputToken && inputAmount && outputAmount && (
        <div className="mb-6 p-3 bg-gray-800 rounded-lg text-sm">
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
          {/* Display Price Impact or N/A message */}
          {priceImpact !== null && (
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
          {priceImpact === null &&
            outputAmount &&
            parseFloat(outputAmount) > 0 && (
              <div className="flex justify-between mt-1">
                <span className="text-gray-400">Price Impact</span>
                <span className="text-gray-300">N/A</span>
              </div>
            )}
          {/* Display Minimum Received */}
          {minimumReceived && outputToken && (
            <div className="flex justify-between mt-1">
              <span className="text-gray-400">Minimum Received</span>
              <span className="text-gray-300">
                {/* For MON/WMON pairs, minimum received is exactly 1:1 */}
                {(inputToken.address === "NATIVE" &&
                  outputToken.address === WMON_ADDRESS) ||
                (outputToken.address === "NATIVE" &&
                  inputToken.address === WMON_ADDRESS)
                  ? inputAmount // Exact 1:1 conversion
                  : minimumReceived}{" "}
                {outputToken.symbol}
              </span>
            </div>
          )}
          {/* Display Low Liquidity Message */}
          {lowLiquidityMessage &&
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

      {/* Swap button */}
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
            isSwapLikelyInvalid
          }
          className="w-full py-3 text-lg font-semibold"
        >
          {isSwapLikelyInvalid
            ? "Amount Error / No Output"
            : isPriceImpactTooHigh
            ? "Price Impact Too High"
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
