import React, { useState, useEffect } from "react";
import { ethers } from "ethers";
import { ArrowsUpDownIcon } from "@heroicons/react/24/solid";
import { usePrivy } from "@privy-io/react-auth";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import { AmountInput } from "./AmountInput";
import { useStageSwap } from "@/hooks/useStageSwap";
import { useTokenBalances } from "@/hooks/useTokenBalances";
import { getDeadlineTimestamp } from "@/lib/contracts/StageSwap";
import showToast from "@/utils/toast";
import { Token } from "@/types/token";

interface AddLiquidityFormProps {
  tokenA: Token;
  tokenB: Token;
  onSwapTokens: () => void;
}

export function AddLiquidityForm({
  tokenA,
  tokenB,
  onSwapTokens,
}: AddLiquidityFormProps) {
  const { user } = usePrivy();
  const [amountA, setAmountA] = useState("");
  const [amountB, setAmountB] = useState("");
  const [slippageTolerance, setSlippageTolerance] = useState("0.5");
  const [poolExists, setPoolExists] = useState(false);
  const [poolRatio, setPoolRatio] = useState<{
    reserveA: bigint;
    reserveB: bigint;
  } | null>(null);
  const [pairAddress, setPairAddress] = useState<string | null>(null);

  const {
    addLiquidity,
    addLiquidityETH,
    getPair,
    isLoading: isSwapHookLoading,
    error,
  } = useStageSwap();

  const { balances, refresh: refreshBalances } = useTokenBalances();
  const [isLoading, setIsLoading] = useState(false);

  // Combined loading state
  const isActionLoading = isLoading || isSwapHookLoading;

  // Check if the pool exists and get the current ratio
  const checkPoolExists = async () => {
    if (!tokenA || !tokenB) return;

    setIsLoading(true);
    try {
      // Check if the pool exists
      const pair = await getPair({
        tokenA:
          tokenA.address === "NATIVE"
            ? "0x760AfE86e5de5fa0Ee542fc7B7B713e1c5425701"
            : tokenA.address,
        tokenB:
          tokenB.address === "NATIVE"
            ? "0x760AfE86e5de5fa0Ee542fc7B7B713e1c5425701"
            : tokenB.address,
      });

      if (
        pair.success &&
        pair.pairAddress &&
        pair.pairAddress !== "0x0000000000000000000000000000000000000000"
      ) {
        setPairAddress(pair.pairAddress);
        setPoolExists(true);

        // Get the current reserves if the pool exists
        if (pair.reserves) {
          setPoolRatio({
            reserveA: pair.reserves[0],
            reserveB: pair.reserves[1],
          });
        }
      } else {
        setPoolExists(false);
        setPoolRatio(null);
        setPairAddress(null);
      }
    } catch (error) {
      console.error("Error checking pool:", error);
      setPoolExists(false);
      setPoolRatio(null);
    } finally {
      setIsLoading(false);
    }
  };

  // Check pool exists when tokens change
  useEffect(() => {
    checkPoolExists();
  }, [tokenA, tokenB]);

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

  // Calculate minimum amount with slippage tolerance
  const calculateMinAmount = (amount: string, decimals: number): string => {
    if (!amount) return "0";
    const parsedAmount = ethers.parseUnits(amount, decimals);
    const slippageFactor = 1 - parseFloat(slippageTolerance) / 100;
    const minAmount =
      (parsedAmount * BigInt(Math.floor(slippageFactor * 10000))) /
      BigInt(10000);
    return minAmount.toString();
  };

  // Handle add liquidity action
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

    setIsLoading(true);

    try {
      // Set deadline to 20 minutes from now
      const deadline = getDeadlineTimestamp(20);

      // Check if we're using native MON
      const isUsingNativeMON =
        tokenA.address === "NATIVE" || tokenB.address === "NATIVE";
      const WMON_ADDRESS = "0x760AfE86e5de5fa0Ee542fc7B7B713e1c5425701";

      let result;

      if (isUsingNativeMON) {
        // When using native MON, ensure it's always tokenB for consistency with addLiquidityETH
        let tokenAddress, tokenAmount, ethAmount, tokenDecimals, ethDecimals;

        if (tokenA.address === "NATIVE") {
          // Token B is the non-native token
          tokenAddress = tokenB.address;
          tokenAmount = amountB;
          tokenDecimals = tokenB.decimals;
          ethAmount = amountA;
          ethDecimals = tokenA.decimals;
        } else {
          // Token A is the non-native token
          tokenAddress = tokenA.address;
          tokenAmount = amountA;
          tokenDecimals = tokenA.decimals;
          ethAmount = amountB;
          ethDecimals = tokenB.decimals;
        }

        // Convert amounts to wei
        const amountTokenDesired = ethers
          .parseUnits(tokenAmount, tokenDecimals)
          .toString();
        const amountETH = ethers.parseUnits(ethAmount, ethDecimals).toString();

        // Calculate minimum amounts with slippage
        const amountTokenMin = calculateMinAmount(tokenAmount, tokenDecimals);
        const amountETHMin = calculateMinAmount(ethAmount, ethDecimals);

        // Execute addLiquidityETH
        result = await addLiquidityETH({
          token: tokenAddress,
          amountTokenDesired,
          amountTokenMin,
          amountETHMin,
          to: "", // Will be replaced with smart wallet address in the hook
          deadline,
        });
      } else {
        // Regular token-token liquidity
        const amountAWei = ethers
          .parseUnits(amountA, tokenA.decimals)
          .toString();
        const amountBWei = ethers
          .parseUnits(amountB, tokenB.decimals)
          .toString();

        // Calculate minimum amounts with slippage
        const amountAMin = calculateMinAmount(amountA, tokenA.decimals);
        const amountBMin = calculateMinAmount(amountB, tokenB.decimals);

        // Execute regular addLiquidity
        result = await addLiquidity({
          tokenA: tokenA.address,
          tokenB: tokenB.address,
          amountADesired: amountAWei,
          amountBDesired: amountBWei,
          amountAMin,
          amountBMin,
          to: "", // Will be replaced with smart wallet address in the hook
          deadline,
        });
      }

      if (result.success) {
        // Reset input fields
        setAmountA("");
        setAmountB("");
        // Refresh balances
        refreshBalances();
        // Refresh pool info after adding liquidity
        setTimeout(checkPoolExists, 5000);
        showToast.success("Liquidity added successfully");
      } else {
        showToast.error(result.error || "Failed to add liquidity");
      }
    } catch (error) {
      console.error("Error adding liquidity:", error);
      showToast.error(
        error instanceof Error ? error.message : "Failed to add liquidity"
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      {/* Amount inputs */}
      <div className="mb-4">
        <AmountInput
          value={amountA}
          onChange={setAmountA}
          label={`${tokenA.symbol} Amount`}
          max={getTokenBalance(tokenA)}
          showMaxButton
          onMaxClick={() => {
            const balance = getTokenBalance(tokenA);
            if (balance) setAmountA(balance);
          }}
          disabled={isActionLoading}
        />
      </div>

      {/* Switch button */}
      <div className="flex justify-center my-4">
        <PrimaryButton
          onClick={onSwapTokens}
          disabled={isActionLoading}
          className="p-2 rounded-full"
        >
          <ArrowsUpDownIcon className="w-5 h-5 text-gray-300" />
        </PrimaryButton>
      </div>

      <div className="mb-6">
        <AmountInput
          value={amountB}
          onChange={setAmountB}
          label={`${tokenB.symbol} Amount`}
          max={getTokenBalance(tokenB)}
          showMaxButton
          onMaxClick={() => {
            const balance = getTokenBalance(tokenB);
            if (balance) setAmountB(balance);
          }}
          disabled={isActionLoading}
        />
      </div>

      {/* Pool info display */}
      {poolExists && poolRatio && (
        <div className="mb-4 p-3 bg-gray-800 rounded-lg">
          <div className="text-sm text-gray-300 mb-1">
            <span className="text-gray-400">Pool Info:</span> Liquidity Already
            Exists
          </div>
          <div className="text-xs text-gray-400">
            <div>Current Pool Balance:</div>
            <div>
              {ethers.formatUnits(poolRatio.reserveA, tokenA.decimals)}{" "}
              {tokenA.symbol} and{" "}
              {ethers.formatUnits(poolRatio.reserveB, tokenB.decimals)}{" "}
              {tokenB.symbol}
            </div>
          </div>
        </div>
      )}

      {/* Slippage setting */}
      <div className="mb-4 p-3 bg-gray-800 rounded-lg">
        <div className="flex justify-between text-sm items-center">
          <span className="text-gray-400">Slippage Tolerance</span>
          <select
            value={slippageTolerance}
            onChange={(e) => setSlippageTolerance(e.target.value)}
            className="bg-gray-700 rounded px-2 py-1 text-white text-sm"
            disabled={isActionLoading}
          >
            <option value="0.1">0.1%</option>
            <option value="0.5">0.5%</option>
            <option value="1.0">1.0%</option>
            <option value="3.0">3.0%</option>
          </select>
        </div>
      </div>

      {/* Submit button */}
      <PrimaryButton
        onClick={handleAddLiquidity}
        disabled={!user || isActionLoading || !amountA || !amountB}
        isLoading={isActionLoading}
        fullWidth
      >
        {!user
          ? "Connect Wallet"
          : !amountA || !amountB
          ? "Enter Amounts"
          : "Add Liquidity"}
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
