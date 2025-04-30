import React, { useState, useEffect, useCallback } from "react";
import { ArrowDownIcon, ArrowsUpDownIcon } from "@heroicons/react/24/solid";
import { ethers } from "ethers";
import { usePrivy } from "@privy-io/react-auth";
import { TokenSelector } from "./TokenSelector";
import { AmountInput } from "./AmountInput";
import { useStageSwap } from "@/hooks/useStageSwap";
import { useSmartWalletBalance } from "@/hooks/useSmartWalletBalance";
import { getDeadlineTimestamp } from "@/lib/contracts/StageSwap";
import showToast from "@/utils/toast";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { CONTRACT_ADDRESSES } from "@/lib/contracts/addresses";

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
    address: CONTRACT_ADDRESSES.monadTestnet.weth,
    symbol: "MON",
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
  } = useStageSwap();
  const { balance: smartWalletBalance, refresh: refreshSmartWalletBalance } =
    useSmartWalletBalance();

  // Combined loading state
  const isLoading = isSwapping || isSwapHookLoading;

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

        // Call the hook to get the output amount
        const result = await getAmountsOut({
          amountIn: amountInWei,
          path: [inputToken.address, outputToken.address],
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

      // Execute the swap
      const swapResult = await swapExactTokensForTokens({
        amountIn: amountInWei,
        amountOutMin: minOutputAmount,
        path: [inputToken.address, outputToken.address],
        to: "", // Will be replaced with smart wallet address in the hook
        deadline,
      });

      if (swapResult.success) {
        showToast.success("Swap completed successfully!");
        // Reset input fields
        setInputAmount("");
        setOutputAmount("");
        // Refresh user's balance
        refreshSmartWalletBalance();
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
          max={smartWalletBalance}
          showMaxButton
          onMaxClick={() =>
            smartWalletBalance && setInputAmount(smartWalletBalance)
          }
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
        <button
          type="button"
          onClick={handleSwapTokens}
          className="p-2 rounded-full bg-gray-800 hover:bg-gray-700"
          disabled={isLoading}
        >
          <ArrowsUpDownIcon className="w-5 h-5 text-gray-300" />
        </button>
      </div>

      {/* Output section */}
      <div className="mb-6">
        <AmountInput
          value={outputAmount}
          onChange={setOutputAmount}
          label="To (estimated)"
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
      <button
        type="button"
        onClick={handleSwap}
        disabled={!user || isLoading || !inputAmount || !outputAmount}
        className={`w-full py-3 rounded-lg font-medium ${
          !user || isLoading || !inputAmount || !outputAmount
            ? "bg-gray-700 text-gray-500 cursor-not-allowed"
            : "bg-[#836ef9] text-white hover:bg-[#6f5bd0]"
        }`}
      >
        {isLoading ? (
          <div className="flex items-center justify-center">
            <LoadingSpinner color="#FFFFFF" size={14} />
            <span className="ml-2">Processing...</span>
          </div>
        ) : !user ? (
          "Connect Wallet"
        ) : !inputAmount || !outputAmount ? (
          "Enter an amount"
        ) : (
          "Swap"
        )}
      </button>

      {/* Error message */}
      {error && (
        <div className="mt-4 p-3 bg-red-900/30 text-red-400 rounded-lg text-sm">
          {error}
        </div>
      )}
    </div>
  );
}
