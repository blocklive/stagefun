"use client";

import { useState } from "react";
import { FaPlay, FaInfoCircle } from "react-icons/fa";
import { usePoolExecutionTransition } from "../../../../hooks/usePoolExecutionTransition";
import showToast from "@/utils/toast";
import Tooltip from "../../../../components/Tooltip";
import { PoolStatus } from "../../../../lib/contracts/types";

interface BeginExecutionButtonProps {
  poolAddress: string;
  isCreator: boolean;
  refreshPoolData: () => Promise<void>;
  currentStatus: PoolStatus;
}

export default function BeginExecutionButton({
  poolAddress,
  isCreator,
  refreshPoolData,
  currentStatus,
}: BeginExecutionButtonProps) {
  const [localLoading, setLocalLoading] = useState(false);
  const { isLoading: hookLoading, beginExecution } =
    usePoolExecutionTransition();

  // Combined loading state
  const isExecuting = localLoading || hookLoading;

  const handleBeginExecution = async () => {
    if (!poolAddress) {
      showToast.error("Pool contract address not found");
      return;
    }

    if (!isCreator) {
      showToast.error("Only the creator can begin execution");
      return;
    }

    if (currentStatus !== PoolStatus.FUNDED) {
      showToast.error("Pool must be in FUNDED state to begin execution");
      return;
    }

    setLocalLoading(true);
    const loadingToast = showToast.loading("Starting event execution phase...");

    try {
      const result = await beginExecution(poolAddress);

      if (!result.success) {
        throw new Error(result.error || "Failed to begin execution");
      }

      showToast.success("Pool has moved to execution phase successfully!", {
        id: loadingToast,
      });

      // Refresh pool data after transaction
      setTimeout(() => refreshPoolData(), 3000);
    } catch (error) {
      console.error("Error beginning execution:", error);
      showToast.error(
        `Failed to begin execution: ${
          error instanceof Error ? error.message : String(error)
        }`,
        {
          id: loadingToast,
        }
      );
    } finally {
      setLocalLoading(false);
    }
  };

  return (
    <div className="flex items-center mb-4">
      <button
        onClick={handleBeginExecution}
        disabled={isExecuting}
        className="bg-[#FFFFFF14] hover:bg-[#FFFFFF1A] text-white py-2 px-4 rounded-lg font-medium transition-colors flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isExecuting ? (
          <span className="flex items-center">
            <svg
              className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              ></circle>
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              ></path>
            </svg>
            Processing...
          </span>
        ) : (
          <>
            <FaPlay className="mr-2" /> Start Using Funds
          </>
        )}
      </button>
      <Tooltip
        text="Pressing this button will transition the pool to the Executing state, allowing you to use the funds. You will no longer be able to receive additional commitments."
        width="280px"
        position="right"
        icon={<FaInfoCircle className="ml-2 text-gray-400 hover:text-white" />}
      />
    </div>
  );
}
