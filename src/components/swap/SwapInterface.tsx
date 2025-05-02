import React, { useState, useEffect, useCallback } from "react";
import { ArrowDownIcon, ArrowsUpDownIcon } from "@heroicons/react/24/solid";
import { ethers } from "ethers";
import { usePrivy } from "@privy-io/react-auth";
import { TokenSelector } from "./TokenSelector";
import { AmountInput } from "./AmountInput";
import { useStageSwap } from "@/hooks/useStageSwap";
import { useTokenBalances } from "@/hooks/useTokenBalances";
import { getDeadlineTimestamp } from "@/lib/contracts/StageSwap";
import showToast from "@/utils/toast";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { CONTRACT_ADDRESSES } from "@/lib/contracts/addresses";
import { PrimaryButton } from "@/components/ui/PrimaryButton";

// Define Token interface
interface Token {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  logoURI: string;
}

// Token data with real contract addresses
const TOKENS: Token[] = [
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
    address: "0x760AfE86e5de5fa0Ee542fc7B7B713e1c5425701", // Official WMON address
    symbol: "WMON",
    name: "Wrapped MON",
    decimals: 18,
    logoURI: "/icons/mon-logo.svg",
  },
];

export function SwapInterface() {
  const { user } = usePrivy();
  const [inputToken, setInputToken] = useState(TOKENS[0]);
  const [outputToken, setOutputToken] = useState(TOKENS[1]);
  const [inputAmount, setInputAmount] = useState("");
  const [outputAmount, setOutputAmount] = useState("");
  const [isExactIn, setIsExactIn] = useState(true);
  const [priceImpact, setPriceImpact] = useState<string | null>(null);
  const [isSwapping, setIsSwapping] = useState(false);

  const {
    swapExactTokensForTokens,
    getAmountsOut,
    isLoading: isSwapHookLoading,
    error,
    swapExactETHForTokens,
    swapExactTokensForETH,
  } = useStageSwap();
  const { balances, refresh: refreshBalances } = useTokenBalances();

  // Combined loading state
  const isLoading = isSwapping || isSwapHookLoading;

  // Helper function to get the appropriate balance based on token
  const getTokenBalance = (token: Token): string => {
    if (!balances) return "0";

    if (token.symbol === "USDC") {
      return balances.usdc;
    } else if (token.symbol === "WMON") {
      return balances.wmon;
    } else if (token.symbol === "MON") {
      return balances.mon; // Native MON balance
    }

    return "0";
  };

  // Function to swap the input and output tokens
  const handleSwapTokens = () => {
    setInputToken(outputToken);
    setOutputToken(inputToken);
    setInputAmount(outputAmount);
    setOutputAmount(inputAmount);
    setIsExactIn(!isExactIn);
  };

  // Get quote when input amount or tokens change
  useEffect(() => {
    const getQuote = async () => {
      if (
        !inputAmount ||
        parseFloat(inputAmount) === 0 ||
        !inputToken ||
        !outputToken
      ) {
        setOutputAmount("");
        setPriceImpact(null);
        return;
      }

      try {
        // Convert input amount to wei
        const amountInWei = ethers
          .parseUnits(inputAmount, inputToken.decimals)
          .toString();

        // Check if we're using native MON - for price quotes, treat it as WMON
        const isInputNative = inputToken.address === "NATIVE";
        const isOutputNative = outputToken.address === "NATIVE";

        // Use WMON address for native MON in the quote
        const WMON_ADDRESS = "0x760AfE86e5de5fa0Ee542fc7B7B713e1c5425701";
        const adjustedInputAddress = isInputNative
          ? WMON_ADDRESS
          : inputToken.address;
        const adjustedOutputAddress = isOutputNative
          ? WMON_ADDRESS
          : outputToken.address;

        // Call the hook to get the output amount
        const result = await getAmountsOut({
          amountIn: amountInWei,
          path: [adjustedInputAddress, adjustedOutputAddress],
        });

        if (result.success && result.amounts && result.amounts.length >= 2) {
          // Convert output amount from wei to display amount
          const out = ethers.formatUnits(
            result.amounts[1],
            outputToken.decimals
          );
          setOutputAmount(out);

          // Calculate price impact (simplified)
          // In a real app, you'd need more complex price impact calculation
          const inputValue = parseFloat(inputAmount);
          const outputValue = parseFloat(out);
          if (inputValue > 0 && outputValue > 0) {
            const impact = Math.abs((1 - outputValue / inputValue) * 100);
            setPriceImpact(impact.toFixed(2));
          }
        } else {
          setOutputAmount("");
          setPriceImpact(null);
        }
      } catch (error) {
        console.error("Error getting quote:", error);
        setOutputAmount("");
        setPriceImpact(null);
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

    setIsSwapping(true);

    try {
      console.log("Swapping tokens:", {
        inputToken: inputToken.symbol,
        outputToken: outputToken.symbol,
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

      // Define the WMON address (needed for swap paths)
      const WMON_ADDRESS = "0x760AfE86e5de5fa0Ee542fc7B7B713e1c5425701";

      console.log("Swap details:", {
        isInputNative,
        isOutputNative,
        inputToken: inputToken.symbol,
        outputToken: outputToken.symbol,
        inputAddress: inputToken.address,
        outputAddress: outputToken.address,
      });

      let swapResult;

      // Handle different swap scenarios based on token types
      if (isInputNative) {
        // Case 1: Swapping native MON to token (e.g., MON -> USDC)
        console.log("Swapping native MON to token...");

        // We'll use swapExactETHForTokens - create the path with WMON at the start
        const path = [WMON_ADDRESS, outputToken.address];

        // Since we're sending MON natively, we need to use swapExactETHForTokens
        swapResult = await swapExactETHForTokens({
          amountOutMin: minOutputAmount,
          path: path,
          to: "", // Will be filled in by the hook
          deadline: deadline,
          value: amountInWei, // Send the MON amount as value
        });
      } else if (isOutputNative) {
        // Case 2: Swapping token to native MON (e.g., USDC -> MON)
        console.log("Swapping token to native MON...");

        // We'll use swapExactTokensForETH - create the path with WMON at the end
        const path = [inputToken.address, WMON_ADDRESS];

        swapResult = await swapExactTokensForETH({
          amountIn: amountInWei,
          amountOutMin: minOutputAmount,
          path: path,
          to: "", // Will be filled in by the hook
          deadline: deadline,
        });
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
    <div className="w-full max-w-md mx-auto bg-[#1e1e2a] rounded-2xl shadow-md p-6 text-white">
      <h2 className="text-2xl font-bold mb-6">Swap</h2>

      {/* Input section */}
      <div className="mb-2">
        <AmountInput
          value={inputAmount}
          onChange={setInputAmount}
          label="From"
          max={getTokenBalance(inputToken)}
          showMaxButton
          onMaxClick={() => {
            const balance = getTokenBalance(inputToken);
            if (balance) setInputAmount(balance);
          }}
          disabled={isLoading}
        />
        <div className="mt-2">
          <TokenSelector
            selectedToken={inputToken}
            onTokenSelect={setInputToken}
            tokens={TOKENS}
            disabled={isLoading}
          />
        </div>
      </div>

      {/* Switch button */}
      <div className="flex justify-center my-4">
        <PrimaryButton
          onClick={handleSwapTokens}
          disabled={isLoading}
          className="p-2 rounded-full"
        >
          <ArrowsUpDownIcon className="w-5 h-5 text-gray-300" />
        </PrimaryButton>
      </div>

      {/* Output section */}
      <div className="mb-6">
        <AmountInput
          value={outputAmount}
          onChange={setOutputAmount}
          label="To (estimated)"
          max={getTokenBalance(outputToken)}
          disabled={true}
        />
        <div className="mt-2">
          <TokenSelector
            selectedToken={outputToken}
            onTokenSelect={setOutputToken}
            tokens={TOKENS.filter((t) => t.address !== inputToken.address)}
            disabled={isLoading}
          />
        </div>
      </div>

      {/* Price info */}
      {inputAmount && outputAmount && (
        <div className="mb-4 p-3 bg-gray-800 rounded-lg">
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">Price</span>
            <span>
              1 {inputToken.symbol} ={" "}
              {(parseFloat(outputAmount) / parseFloat(inputAmount)).toFixed(6)}{" "}
              {outputToken.symbol}
            </span>
          </div>
          {priceImpact && (
            <div className="flex justify-between text-sm mt-1">
              <span className="text-gray-400">Price Impact</span>
              <span
                className={`${
                  parseFloat(priceImpact) > 5 ? "text-red-500" : "text-gray-300"
                }`}
              >
                {priceImpact}%
              </span>
            </div>
          )}
        </div>
      )}

      {/* Swap button */}
      <PrimaryButton
        onClick={handleSwap}
        disabled={!user || isLoading || !inputAmount || !outputAmount}
        isLoading={isLoading}
        fullWidth
      >
        {!user
          ? "Connect Wallet"
          : !inputAmount || !outputAmount
          ? "Enter an amount"
          : "Swap"}
      </PrimaryButton>

      {/* Error message */}
      {error && (
        <div className="mt-4 p-3 bg-red-900/30 text-red-400 rounded-lg text-sm">
          {error}
        </div>
      )}
    </div>
  );
}
