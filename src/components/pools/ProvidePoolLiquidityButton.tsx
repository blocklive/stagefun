import React from "react";
import { useRouter } from "next/navigation";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import { IoSwapVertical } from "react-icons/io5";
import { CONTRACT_ADDRESSES } from "@/lib/contracts/addresses";

// LP token multiplier constant from the StageDotFunPool contract
const LP_TOKEN_MULTIPLIER = 1000;

interface ProvidePoolLiquidityButtonProps {
  lpTokenSymbol: string;
  lpTokenAddress: string;
  amount: string;
  poolUniqueId: string;
}

export function ProvidePoolLiquidityButton({
  lpTokenSymbol,
  lpTokenAddress,
  amount,
  poolUniqueId,
}: ProvidePoolLiquidityButtonProps) {
  const router = useRouter();

  const handleProvideClick = () => {
    // Calculate a default of 50% of their LP tokens for a balanced 1:1 pool
    // This creates a pool with 50% LP tokens and equivalent USDC on the other side
    const lpAmount = parseFloat(amount) * 0.5;

    // Calculate the equivalent USDC amount (1/1000 of LP tokens to account for the multiplier)
    // This ensures a 1:1 exchange rate considering the multiplier from the funding pool
    const usdcAmount = lpAmount / LP_TOKEN_MULTIPLIER;

    // Create query parameters for the liquidity page with both amounts
    const params = new URLSearchParams({
      tokenA: lpTokenAddress,
      tokenASymbol: lpTokenSymbol,
      tokenB: CONTRACT_ADDRESSES.monadTestnet.usdc,
      tokenBSymbol: "USDC",
      amountA: lpAmount.toString(),
      amountB: usdcAmount.toString(),
      source: `stage_pool-${poolUniqueId}`,
    });

    // Navigate to the liquidity page with query parameters
    router.push(`/swap/liquidity?${params.toString()}`);
  };

  return (
    <div className="mt-3">
      <PrimaryButton
        onClick={handleProvideClick}
        className="w-full py-2 flex items-center justify-center"
      >
        <IoSwapVertical className="mr-2" />
        Provide Liquidity & Earn Fees
      </PrimaryButton>
      <p className="text-xs text-gray-400 mt-1 text-center">
        Earn trading fees when others trade your {lpTokenSymbol} tokens
      </p>
    </div>
  );
}
