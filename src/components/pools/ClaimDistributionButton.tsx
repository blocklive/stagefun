import { useEffect, useState } from "react";
import { useClaimDistribution } from "@/hooks/useClaimDistribution";
import { fromUSDCBaseUnits, formatUSDC } from "@/lib/contracts/StageDotFunPool";
import { LoadingSpinner } from "@/components/LoadingSpinner";

interface ClaimDistributionButtonProps {
  poolAddress: string;
  isExecuting: boolean;
  hasRevenueAccumulated?: boolean;
  onSuccess?: () => void;
  className?: string;
}

export function ClaimDistributionButton({
  poolAddress,
  isExecuting,
  hasRevenueAccumulated = true,
  onSuccess,
  className = "",
}: ClaimDistributionButtonProps) {
  const {
    isClaiming,
    pendingAmount,
    fetchPendingRewards,
    handleClaimDistribution,
  } = useClaimDistribution();
  const [isLoading, setIsLoading] = useState(true);
  const [formattedPendingAmount, setFormattedPendingAmount] =
    useState<string>("");

  useEffect(() => {
    let isMounted = true;

    const loadPendingRewards = async () => {
      if (!poolAddress || !isExecuting) {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        const rewards = await fetchPendingRewards(poolAddress);

        if (isMounted) {
          console.log(
            `[ClaimDistribution] Pool: ${poolAddress} - Pending rewards: ${rewards.toString()} (${
              rewards > 0 ? fromUSDCBaseUnits(rewards) : 0
            } USDC)`
          );

          const formatted =
            rewards > 0 ? formatUSDC(fromUSDCBaseUnits(rewards)) : "0.00";

          setFormattedPendingAmount(formatted);
        }
      } catch (error) {
        console.error("Error fetching pending rewards:", error);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadPendingRewards();

    return () => {
      isMounted = false;
    };
  }, [poolAddress, isExecuting, fetchPendingRewards]);

  const handleClick = async () => {
    await handleClaimDistribution(poolAddress, onSuccess);
  };

  // Only show button if pool is executing
  if (!isExecuting) {
    return null;
  }

  if (isLoading) {
    return (
      <button
        disabled
        className={`${className} bg-gray-300 text-gray-700 px-4 py-2 rounded-full flex items-center justify-center space-x-2 cursor-not-allowed`}
      >
        <LoadingSpinner color="#666666" size={16} />{" "}
        <span>Checking rewards...</span>
      </button>
    );
  }

  // If no pending rewards, show disabled button
  if (!pendingAmount || pendingAmount <= BigInt(0)) {
    return (
      <button
        disabled
        className={`${className} bg-gray-300 text-gray-700 px-4 py-2 rounded-full cursor-not-allowed`}
      >
        No Rewards Available
      </button>
    );
  }

  return (
    <button
      onClick={handleClick}
      disabled={isClaiming}
      className={`${className} bg-[#836EF9] hover:bg-[#7058E8] text-white py-3 px-4 rounded-full flex items-center justify-center space-x-2 font-medium transition-colors ${
        isClaiming ? "cursor-not-allowed" : "cursor-pointer"
      }`}
    >
      {isClaiming ? (
        <>
          <LoadingSpinner color="#FFFFFF" size={16} /> <span>Claiming...</span>
        </>
      ) : (
        <>Claim {formattedPendingAmount} USDC</>
      )}
    </button>
  );
}
