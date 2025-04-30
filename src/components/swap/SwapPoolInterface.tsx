import React, { useState, useEffect } from "react";
import { ArrowDownIcon } from "@heroicons/react/24/solid";
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

export function SwapPoolInterface() {
  const { user } = usePrivy();
  const [tokenA, setTokenA] = useState(TOKENS[0]); // USDC
  const [tokenB, setTokenB] = useState(TOKENS[1]); // MON
  const [amountA, setAmountA] = useState("");
  const [amountB, setAmountB] = useState("");
  const [slippageTolerance, setSlippageTolerance] = useState("0.5");
  const [isAddingLiquidity, setIsAddingLiquidity] = useState(false);

  const {
    addLiquidity,
    addLiquidityETH,
    isLoading: isSwapHookLoading,
    error,
  } = useStageSwap();
  const {
    balances,
    isLoading: isBalanceLoading,
    refresh: refreshBalances,
  } = useTokenBalances();

  // Combined loading state
  const isLoading = isAddingLiquidity || isSwapHookLoading || isBalanceLoading;

  // Get the relevant balance for the selected token
  const getTokenBalance = (token: Token): string => {
    if (token.address === CONTRACT_ADDRESSES.monadTestnet.usdc) {
      return balances.usdc;
    } else if (token.address === CONTRACT_ADDRESSES.monadTestnet.weth) {
      return balances.mon;
    }
    return "0";
  };

  // Calculate minimum amounts based on slippage tolerance
  const calculateMinAmount = (amount: string, decimals: number): string => {
    if (!amount || parseFloat(amount) === 0) return "0";

    const parsedAmount = ethers.parseUnits(amount, decimals);
    const slippageFactor = 1 - parseFloat(slippageTolerance) / 100;
    const minAmount =
      (parsedAmount * BigInt(Math.floor(slippageFactor * 10000))) /
      BigInt(10000);

    return minAmount.toString();
  };

  // Handle liquidity addition
  const handleAddLiquidity = async () => {
    if (!user) {
      showToast.error("Please log in first");
      return;
    }

    if (
      !amountA ||
      parseFloat(amountA) === 0 ||
      !amountB ||
      parseFloat(amountB) === 0
    ) {
      showToast.error("Please enter amounts for both tokens");
      return;
    }

    // Check if amounts exceed balances
    if (parseFloat(amountA) > parseFloat(getTokenBalance(tokenA))) {
      showToast.error(`Insufficient ${tokenA.symbol} balance`);
      return;
    }

    if (parseFloat(amountB) > parseFloat(getTokenBalance(tokenB))) {
      showToast.error(`Insufficient ${tokenB.symbol} balance`);
      return;
    }

    setIsAddingLiquidity(true);

    try {
      // Set deadline to 20 minutes from now
      const deadline = getDeadlineTimestamp(20);

      // Check if we're using MON (in which case we should use addLiquidityETH)
      const isUsingNativeMON =
        tokenB.address === CONTRACT_ADDRESSES.monadTestnet.weth;

      if (isUsingNativeMON) {
        console.log("Adding liquidity with native MON:", {
          tokenA: tokenA.symbol,
          tokenB: tokenB.symbol,
          amountA,
          amountB,
        });

        // Convert amounts to wei
        const amountTokenWei = ethers
          .parseUnits(amountA, tokenA.decimals)
          .toString();
        const amountETHWei = ethers
          .parseUnits(amountB, tokenB.decimals)
          .toString();

        // Calculate minimum amounts with slippage tolerance
        const amountTokenMin = calculateMinAmount(amountA, tokenA.decimals);
        const amountETHMin = calculateMinAmount(amountB, tokenB.decimals);

        // Execute addLiquidityETH
        const result = await addLiquidityETH({
          token: tokenA.address,
          amountTokenDesired: amountTokenWei,
          amountTokenMin,
          amountETHMin,
          to: "", // Will be replaced with smart wallet address in the hook
          deadline,
        });

        if (result.success) {
          showToast.success("Liquidity added successfully!");
          // Reset input fields
          setAmountA("");
          setAmountB("");
          // Refresh balances
          refreshBalances();
        } else {
          showToast.error(result.error || "Failed to add liquidity");
        }
      } else {
        console.log("Adding liquidity with tokens:", {
          tokenA: tokenA.symbol,
          tokenB: tokenB.symbol,
          amountA,
          amountB,
        });

        // Convert amounts to wei
        const amountAWei = ethers
          .parseUnits(amountA, tokenA.decimals)
          .toString();
        const amountBWei = ethers
          .parseUnits(amountB, tokenB.decimals)
          .toString();

        // Calculate minimum amounts with slippage tolerance
        const amountAMin = calculateMinAmount(amountA, tokenA.decimals);
        const amountBMin = calculateMinAmount(amountB, tokenB.decimals);

        // Execute regular addLiquidity
        const result = await addLiquidity({
          tokenA: tokenA.address,
          tokenB: tokenB.address,
          amountADesired: amountAWei,
          amountBDesired: amountBWei,
          amountAMin,
          amountBMin,
          to: "", // Will be replaced with smart wallet address in the hook
          deadline,
        });

        if (result.success) {
          showToast.success("Liquidity added successfully!");
          // Reset input fields
          setAmountA("");
          setAmountB("");
          // Refresh balances
          refreshBalances();
        } else {
          showToast.error(result.error || "Failed to add liquidity");
        }
      }
    } catch (error) {
      console.error("Error adding liquidity:", error);
      showToast.error(
        error instanceof Error ? error.message : "Failed to add liquidity"
      );
    } finally {
      setIsAddingLiquidity(false);
    }
  };

  // Handle slippage tolerance change
  const handleSlippageChange = (value: string) => {
    if (value === "" || /^\d*\.?\d*$/.test(value)) {
      if (value === "" || parseFloat(value) <= 100) {
        setSlippageTolerance(value);
      }
    }
  };

  return (
    <div className="w-full max-w-md mx-auto bg-[#1e1e2a] rounded-2xl shadow-md p-6 text-white">
      <div className="mb-6">
        <h2 className="text-xl font-semibold">Add Liquidity</h2>
        <p className="text-sm text-gray-400 mt-1">
          Add liquidity to receive LP tokens
        </p>
      </div>

      {/* First token input */}
      <div className="mb-2">
        <div className="flex justify-between items-center mb-1">
          <label className="text-sm text-gray-400">Input</label>
          <div className="text-sm text-gray-400">
            Balance:{" "}
            <span className="font-medium">{getTokenBalance(tokenA)}</span>
          </div>
        </div>
        <AmountInput
          value={amountA}
          onChange={setAmountA}
          max={getTokenBalance(tokenA)}
          showMaxButton
          onMaxClick={() => setAmountA(getTokenBalance(tokenA))}
          disabled={isLoading}
        />
        <div className="mt-2">
          <TokenSelector
            selectedToken={tokenA}
            onTokenSelect={setTokenA}
            tokens={TOKENS}
            disabled={isLoading}
          />
        </div>
      </div>

      {/* Plus sign */}
      <div className="flex justify-center my-4">
        <div className="p-2 bg-gray-800 rounded-full">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 4v16m8-8H4"
            />
          </svg>
        </div>
      </div>

      {/* Second token input */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-1">
          <label className="text-sm text-gray-400">Input</label>
          <div className="text-sm text-gray-400">
            Balance:{" "}
            <span className="font-medium">{getTokenBalance(tokenB)}</span>
          </div>
        </div>
        <AmountInput
          value={amountB}
          onChange={setAmountB}
          max={getTokenBalance(tokenB)}
          showMaxButton
          onMaxClick={() => setAmountB(getTokenBalance(tokenB))}
          disabled={isLoading}
        />
        <div className="mt-2">
          <TokenSelector
            selectedToken={tokenB}
            onTokenSelect={setTokenB}
            tokens={TOKENS.filter((t) => t.address !== tokenA.address)}
            disabled={isLoading}
          />
        </div>
      </div>

      {/* Slippage settings */}
      <div className="mb-6 p-3 bg-gray-800 rounded-lg">
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-400">Slippage tolerance</span>
          <div className="flex items-center">
            <input
              type="text"
              value={slippageTolerance}
              onChange={(e) => handleSlippageChange(e.target.value)}
              className="w-12 px-2 py-1 text-right bg-gray-700 border border-gray-600 rounded-md text-white text-sm"
            />
            <span className="ml-1 text-sm text-gray-300">%</span>
          </div>
        </div>
      </div>

      {/* Add liquidity button */}
      <button
        type="button"
        onClick={handleAddLiquidity}
        disabled={!user || isLoading || !amountA || !amountB}
        className={`w-full py-3 rounded-lg font-medium ${
          !user || isLoading || !amountA || !amountB
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
        ) : !amountA || !amountB ? (
          "Enter amounts"
        ) : (
          "Add Liquidity"
        )}
      </button>

      {/* Error message */}
      {error && (
        <div className="mt-4 p-3 bg-red-900/30 text-red-400 rounded-lg text-sm">
          {error}
        </div>
      )}

      {/* Information card */}
      <div className="mt-6 p-4 bg-gray-800/50 rounded-lg border border-gray-700">
        <h3 className="text-sm font-medium text-gray-300 mb-2">Information</h3>
        <p className="text-xs text-gray-400 mb-2">
          • Adding liquidity to this empty pool will set the initial exchange
          rate
        </p>
        <p className="text-xs text-gray-400 mb-2">
          • LP tokens represent your position and allow you to reclaim your
          assets
        </p>
        <p className="text-xs text-gray-400">
          • You can add equal values of both tokens for the best results
        </p>
      </div>
    </div>
  );
}
