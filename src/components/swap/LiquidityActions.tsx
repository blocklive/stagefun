import React from "react";
import { ethers } from "ethers";
import { getDeadlineTimestamp } from "@/lib/contracts/StageSwap";
import { useStageSwap } from "@/hooks/useStageSwap";
import { useTokenBalances } from "@/hooks/useTokenBalances";
import showToast from "@/utils/toast";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import { CONTRACT_ADDRESSES } from "@/lib/contracts/addresses";

// Official WMON token address
const OFFICIAL_WMON_ADDRESS = "0x760AfE86e5de5fa0Ee542fc7B7B713e1c5425701";

interface Token {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  logoURI: string;
}

interface LiquidityActionsProps {
  user: any;
  tokenA: Token;
  tokenB: Token;
  amountA: string;
  amountB: string;
  slippageTolerance: string;
  poolExists: boolean;
  poolRatio: { reserveA: bigint; reserveB: bigint } | null;
  pairAddress: string | null;
  isLoading: boolean;
  checkPoolExists: () => Promise<void>;
  setAmountA: (value: string) => void;
  setAmountB: (value: string) => void;
  getTokenBalance: (token: Token) => string;
  calculateMinAmount: (amount: string, decimals: number) => string;
}

export function LiquidityActions({
  user,
  tokenA,
  tokenB,
  amountA,
  amountB,
  slippageTolerance,
  poolExists,
  poolRatio,
  pairAddress,
  isLoading,
  checkPoolExists,
  setAmountA,
  setAmountB,
  getTokenBalance,
  calculateMinAmount,
}: LiquidityActionsProps) {
  const {
    addLiquidity,
    addLiquidityETH,
    isLoading: isSwapHookLoading,
    error,
  } = useStageSwap();
  const { refresh: refreshBalances } = useTokenBalances();

  // Combined loading state
  const isActionLoading = isLoading || isSwapHookLoading;

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

    try {
      // Log if we're creating a new pool or adding to existing
      if (!poolExists) {
        console.log("Creating new pool or resetting empty pool");
      } else {
        console.log("Adding to existing pool with ratio", poolRatio);
      }

      // Set deadline to 20 minutes from now
      const deadline = getDeadlineTimestamp(20);

      // Check if we're using native MON (in which case we should use addLiquidityETH)
      const isUsingNativeMON =
        tokenA.address === "NATIVE" || tokenB.address === "NATIVE";

      // When using native MON, ensure it's always tokenB for consistency with addLiquidityETH
      let actualTokenA = tokenA;
      let actualTokenB = tokenB;
      let actualAmountA = amountA;
      let actualAmountB = amountB;

      if (tokenA.address === "NATIVE") {
        // Swap positions - addLiquidityETH expects the token to be first and ETH to be second
        actualTokenA = tokenB;
        actualTokenB = tokenA;
        actualAmountA = amountB;
        actualAmountB = amountA;
      }

      // Log the operation being performed
      console.log(`Adding liquidity:`, {
        tokenA: actualTokenA.symbol,
        tokenB: actualTokenB.symbol,
        amountA: actualAmountA,
        amountB: actualAmountB,
        isUsingNativeMON,
      });

      // Handle dust amount checks for pools
      if (
        !poolExists &&
        pairAddress &&
        pairAddress !== "0x0000000000000000000000000000000000000000"
      ) {
        try {
          // Check if there are dust amounts in the pool
          const provider = new ethers.JsonRpcProvider(
            process.env.NEXT_PUBLIC_RPC_URL
          );
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

          // Log pool details for debugging
          console.log(
            `Pool total supply: ${ethers.formatUnits(totalSupply, 18)}`
          );

          // Determine which reserve is which based on token order
          const isTokenAZero =
            actualTokenA.address.toLowerCase() === token0.toLowerCase();
          const reserveA = isTokenAZero
            ? BigInt(reserves[0])
            : BigInt(reserves[1]);
          const reserveB = isTokenAZero
            ? BigInt(reserves[1])
            : BigInt(reserves[0]);

          // Format to human-readable numbers
          const reserveAValue = Number(
            ethers.formatUnits(reserveA, actualTokenA.decimals)
          );
          const reserveBValue = Number(
            ethers.formatUnits(reserveB, actualTokenB.decimals)
          );

          console.log(
            `Pool reserves: ${reserveAValue} ${actualTokenA.symbol}, ${reserveBValue} ${actualTokenB.symbol}`
          );

          // Check if the pool has significant reserves
          const SIGNIFICANT_AMOUNT = 0.05;
          if (
            reserveAValue > SIGNIFICANT_AMOUNT ||
            reserveBValue > SIGNIFICANT_AMOUNT
          ) {
            console.warn(
              "Pool has existing reserves. You must follow the exact ratio:"
            );
            console.warn(
              `Current ratio: 1 ${actualTokenA.symbol} = ${
                reserveBValue / reserveAValue
              } ${actualTokenB.symbol}`
            );

            // Calculate exact amounts needed based on the current ratio to help users
            const inputAmountA = parseFloat(actualAmountA || "0");
            const inputAmountB = parseFloat(actualAmountB || "0");

            if (inputAmountA > 0) {
              const neededAmountB =
                inputAmountA * (reserveBValue / reserveAValue);
              console.warn(
                `For ${inputAmountA} ${
                  actualTokenA.symbol
                }, you need exactly ${neededAmountB.toFixed(6)} ${
                  actualTokenB.symbol
                }`
              );
            }

            if (inputAmountB > 0) {
              const neededAmountA =
                inputAmountB * (reserveAValue / reserveBValue);
              console.warn(
                `For ${inputAmountB} ${
                  actualTokenB.symbol
                }, you need exactly ${neededAmountA.toFixed(6)} ${
                  actualTokenA.symbol
                }`
              );
            }
          }
        } catch (error) {
          console.error("Error checking dust amounts:", error);
        }
      }

      if (isUsingNativeMON) {
        console.log("==== NATIVE MON LIQUIDITY FLOW ====");
        console.log("Input values:", {
          tokenA: tokenA.symbol,
          tokenB: tokenB.symbol,
          amountA,
          amountB,
          tokenA_address: tokenA.address,
          tokenB_address: tokenB.address,
        });

        // For native MON, use the addLiquidityETH function
        // When using native MON, the token must be the non-MON token
        const tokenAddress =
          actualTokenA.address === "NATIVE"
            ? OFFICIAL_WMON_ADDRESS
            : actualTokenA.address;

        console.log("Adjusted tokens:", {
          actualTokenA: actualTokenA.symbol,
          actualTokenB: actualTokenB.symbol,
          tokenAddress: tokenAddress,
          isTokenANative: actualTokenA.address === "NATIVE",
          isTokenBNative: actualTokenB.address === "NATIVE",
        });

        // Convert amounts to wei
        const amountTokenWei = ethers
          .parseUnits(actualAmountA, actualTokenA.decimals)
          .toString();
        const amountETHWei = ethers
          .parseUnits(actualAmountB, actualTokenB.decimals)
          .toString();

        console.log("Amounts in wei:", {
          amountTokenWei,
          amountETHWei,
        });

        // Calculate minimum amounts with slippage tolerance
        // Use a slightly higher slippage for native MON to account for potential price movements
        const effectiveSlippage = parseFloat(slippageTolerance) + 0.1;
        const slippageFactor = 1 - effectiveSlippage / 100;

        const amountTokenMin =
          (BigInt(amountTokenWei) *
            BigInt(Math.floor(slippageFactor * 10000))) /
          BigInt(10000);
        const amountETHMin =
          (BigInt(amountETHWei) * BigInt(Math.floor(slippageFactor * 10000))) /
          BigInt(10000);

        console.log("Slippage calculation:", {
          slippageTolerance,
          effectiveSlippage,
          slippageFactor,
          amountTokenMin: amountTokenMin.toString(),
          amountETHMin: amountETHMin.toString(),
        });

        // Important: Ensure we're sending the actual MON amount, not the minimum
        const monadAmountToSend = amountETHWei;

        console.log("Add liquidity params:", {
          token: tokenAddress,
          amountTokenDesired: amountTokenWei,
          amountTokenMin: amountTokenMin.toString(),
          amountETHMin: amountETHMin.toString(),
          monadAmountToSend,
          deadline,
        });

        // Execute addLiquidityETH - use lower amountETHMin for slippage protection,
        // but ensure the actual ETH value is what we want to add
        const result = await addLiquidityETH({
          token: tokenAddress,
          amountTokenDesired: amountTokenWei,
          amountTokenMin: amountTokenMin.toString(),
          amountETHMin: amountETHMin.toString(),
          to: "", // Will be replaced with smart wallet address in the hook
          deadline,
        });

        if (result.success) {
          // Reset input fields
          setAmountA("");
          setAmountB("");
          // Refresh balances
          refreshBalances();
          // Refresh pool info after adding liquidity
          setTimeout(checkPoolExists, 5000);
        }
      } else {
        // Regular addLiquidity for token-token pairs (including WMON-token)
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
          // Reset input fields
          setAmountA("");
          setAmountB("");
          // Refresh balances
          refreshBalances();
          // Refresh pool info after adding liquidity
          setTimeout(checkPoolExists, 5000);
        }
      }
    } catch (error) {
      console.error("Error adding liquidity:", error);
      showToast.error(
        error instanceof Error ? error.message : "Failed to add liquidity"
      );
    }
  };

  return (
    <>
      <PrimaryButton
        onClick={handleAddLiquidity}
        disabled={!user || isActionLoading || !amountA || !amountB}
        isLoading={isActionLoading}
        fullWidth
      >
        {!user
          ? "Connect Wallet"
          : !amountA || !amountB
          ? "Enter amounts"
          : "Add Liquidity"}
      </PrimaryButton>

      {/* Error message */}
      {error && (
        <div className="mt-4 p-3 bg-red-900/30 text-red-400 rounded-lg text-sm">
          {error}
        </div>
      )}
    </>
  );
}
