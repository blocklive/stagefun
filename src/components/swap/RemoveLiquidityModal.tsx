import React, { useState } from "react";
import Image from "next/image";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import {
  useStageSwap,
  RemoveLiquidityETHParams,
  UseStageSwapResult,
} from "@/hooks/useStageSwap";
import { useSmartWallet } from "@/hooks/useSmartWallet";
import { getDeadlineTimestamp } from "@/lib/contracts/StageSwap";
import { ethers } from "ethers";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { CONTRACT_ADDRESSES } from "@/lib/contracts/addresses";

interface RemoveLiquidityModalProps {
  position: any;
  onClose: () => void;
  onSuccess: () => void;
  getTokenIconPath: (symbol: string) => string;
  formatNumber: (value: string, decimals?: number) => string;
}

type RemoveLiquidityResult = Promise<{
  success: boolean;
  error?: string;
  txHash?: string;
}>;

const WMON_ADDRESS = CONTRACT_ADDRESSES.monadTestnet.weth.toLowerCase();

export const RemoveLiquidityModal: React.FC<RemoveLiquidityModalProps> = ({
  position,
  onClose,
  onSuccess,
  getTokenIconPath,
  formatNumber,
}) => {
  const [removePercent, setRemovePercent] = useState(100);
  const [isRemoving, setIsRemoving] = useState(false);
  const { removeLiquidity, removeLiquidityETH } = useStageSwap();
  const { smartWalletAddress } = useSmartWallet();

  const executeRemoveLiquidity = async () => {
    if (!position || !smartWalletAddress) return;

    setIsRemoving(true);
    const deadline = getDeadlineTimestamp(20);
    let result: RemoveLiquidityResult | undefined = undefined;

    try {
      const lpTokenBalance = position.lpTokenBalance;
      if (Number(lpTokenBalance) <= 0) {
        console.error("No LP tokens to remove");
        setIsRemoving(false);
        return;
      }

      const lpTokensToRemove = BigInt(
        Math.floor(((Number(lpTokenBalance) * removePercent) / 100) * 10 ** 18)
      );

      if (lpTokensToRemove <= BigInt(0)) {
        console.error("LP token amount too small to remove");
        setIsRemoving(false);
        return;
      }

      const slippageFactor = 0.995;
      const token0Amount = parseFloat(position.tokenAmounts.amount0);
      const token1Amount = parseFloat(position.tokenAmounts.amount1);

      const amount0Min = BigInt(
        Math.floor(
          token0Amount *
            (removePercent / 100) *
            slippageFactor *
            10 ** position.token0.decimals
        )
      );

      const amount1Min = BigInt(
        Math.floor(
          token1Amount *
            (removePercent / 100) *
            slippageFactor *
            10 ** position.token1.decimals
        )
      );

      const isToken0WMON =
        position.token0.address.toLowerCase() === WMON_ADDRESS;
      const isToken1WMON =
        position.token1.address.toLowerCase() === WMON_ADDRESS;

      if (isToken0WMON || isToken1WMON) {
        console.log("Removing liquidity for a WMON (native) pair.");
        const erc20Token = isToken0WMON ? position.token1 : position.token0;
        const amountETHMin = (
          isToken0WMON ? amount0Min : amount1Min
        ).toString();
        const amountTokenMin = (
          isToken0WMON ? amount1Min : amount0Min
        ).toString();

        console.log("RemoveLiquidityETH params:", {
          token: erc20Token.address,
          liquidity: lpTokensToRemove.toString(),
          amountTokenMin,
          amountETHMin,
          to: smartWalletAddress,
          deadline,
        });

        result = removeLiquidityETH({
          token: erc20Token.address,
          liquidity: lpTokensToRemove.toString(),
          amountTokenMin: amountTokenMin,
          amountETHMin: amountETHMin,
          to: smartWalletAddress,
          deadline,
        });
      } else {
        console.log("Removing liquidity for an ERC20-ERC20 pair.");
        console.log("RemoveLiquidity params:", {
          tokenA: position.token0.address,
          tokenB: position.token1.address,
          liquidity: lpTokensToRemove.toString(),
          amountAMin: amount0Min.toString(),
          amountBMin: amount1Min.toString(),
          to: smartWalletAddress,
          deadline,
        });
        result = removeLiquidity(
          position.token0.address,
          position.token1.address,
          lpTokensToRemove.toString(),
          amount0Min.toString(),
          amount1Min.toString(),
          smartWalletAddress,
          deadline
        );
      }

      const finalResult = await result;
      if (finalResult && finalResult.success) {
        onClose();
        onSuccess();
      }
    } catch (error) {
      console.error("Error in executeRemoveLiquidity:", error);
    } finally {
      setIsRemoving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-[#1e1e2a] rounded-2xl shadow-lg max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold">Remove Liquidity</h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full bg-[#FFFFFF0A] p-1 hover:bg-[#FFFFFF1A] focus:outline-none"
            aria-label="Close"
          >
            <XMarkIcon className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        {/* Pool info */}
        <div className="flex items-center mb-6">
          <div className="flex -space-x-2 mr-3">
            <div className="relative z-10 w-8 h-8 rounded-full overflow-hidden border-2 border-gray-800 bg-white">
              <Image
                src={getTokenIconPath(position.token0.symbol)}
                alt={position.token0.symbol}
                width={32}
                height={32}
              />
            </div>
            <div className="relative w-8 h-8 rounded-full overflow-hidden border-2 border-gray-800 bg-white">
              <Image
                src={getTokenIconPath(position.token1.symbol)}
                alt={position.token1.symbol}
                width={32}
                height={32}
              />
            </div>
          </div>
          <span className="font-medium">
            {position.token0.symbol}/{position.token1.symbol} Pool
          </span>
        </div>

        {/* Amount selector */}
        <div className="mb-6">
          <label className="block text-sm text-gray-400 mb-2">
            Amount to remove
          </label>
          <div className="flex items-center justify-between mb-2">
            <input
              type="range"
              min="1"
              max="100"
              value={removePercent}
              onChange={(e) => setRemovePercent(parseInt(e.target.value))}
              className="w-3/4 accent-purple-500"
            />
            <span className="text-white font-medium">{removePercent}%</span>
          </div>

          {/* Preset percentage buttons */}
          <div className="flex space-x-2 mt-2">
            {[25, 50, 75, 100].map((percent) => (
              <PrimaryButton
                key={percent}
                onClick={() => setRemovePercent(percent)}
                className={`flex-1 ${
                  removePercent === percent ? "bg-purple-700" : ""
                }`}
              >
                {percent}%
              </PrimaryButton>
            ))}
          </div>
        </div>

        {/* You will receive */}
        <div className="mb-6 p-4 bg-gray-800/50 rounded-lg">
          <h4 className="text-sm text-gray-400 mb-2">You will receive</h4>
          <div className="space-y-2">
            <div className="flex justify-between">
              <div className="flex items-center">
                <div className="w-5 h-5 mr-2 rounded-full overflow-hidden bg-white">
                  <Image
                    src={getTokenIconPath(position.token0.symbol)}
                    alt={position.token0.symbol}
                    width={20}
                    height={20}
                  />
                </div>
                <span>{position.token0.symbol}</span>
              </div>
              <span className="font-medium">
                {formatNumber(
                  (
                    (parseFloat(position.tokenAmounts.amount0) *
                      removePercent) /
                    100
                  ).toString(),
                  6
                )}
              </span>
            </div>
            <div className="flex justify-between">
              <div className="flex items-center">
                <div className="w-5 h-5 mr-2 rounded-full overflow-hidden bg-white">
                  <Image
                    src={getTokenIconPath(position.token1.symbol)}
                    alt={position.token1.symbol}
                    width={20}
                    height={20}
                  />
                </div>
                <span>{position.token1.symbol}</span>
              </div>
              <span className="font-medium">
                {formatNumber(
                  (
                    (parseFloat(position.tokenAmounts.amount1) *
                      removePercent) /
                    100
                  ).toString(),
                  6
                )}
              </span>
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex space-x-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 bg-transparent border border-gray-600 hover:border-gray-500 text-white rounded-lg font-medium"
          >
            Cancel
          </button>
          <PrimaryButton
            onClick={executeRemoveLiquidity}
            disabled={isRemoving}
            isLoading={isRemoving}
            className="flex-1"
          >
            Remove
          </PrimaryButton>
        </div>
      </div>
    </div>
  );
};
