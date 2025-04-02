import { FaPlus, FaArrowUp, FaDollarSign } from "react-icons/fa";
import { PoolStatus } from "@/lib/contracts/types";

interface CreatorActionsProps {
  isDepositLoading: boolean;
  isWithdrawing: boolean;
  isDistributing: boolean;
  rawTotalFunds: number;
  onReceiveClick: () => void;
  onWithdrawClick: () => void;
  onDistributeClick: () => void;
  revenueAccumulated: number;
  poolStatus: number;
  targetMet: boolean;
  isBeforeEndTime: boolean;
  belowCap: boolean;
}

export default function CreatorActions({
  isDepositLoading,
  isWithdrawing,
  isDistributing,
  rawTotalFunds,
  onReceiveClick,
  onWithdrawClick,
  onDistributeClick,
  revenueAccumulated,
  poolStatus,
  targetMet,
  isBeforeEndTime,
  belowCap,
}: CreatorActionsProps) {
  // Should show execution actions?
  const isExecuting = poolStatus === PoolStatus.EXECUTING;

  return (
    <div className="flex justify-start space-x-4">
      {/* Receive Button - only shown in EXECUTING state */}
      {isExecuting && (
        <div className="flex flex-col items-center w-20">
          <button
            className="w-10 h-10 bg-[#FFFFFF14] hover:bg-[#FFFFFF1A] rounded-full flex items-center justify-center mb-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
            onClick={onReceiveClick}
            disabled={isDepositLoading}
            title="Receive"
          >
            {isDepositLoading ? (
              <svg
                className="animate-spin h-5 w-5 text-white"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                width="20"
                height="20"
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
            ) : (
              <FaPlus className="w-5 h-5 text-white" />
            )}
          </button>
          <span className="text-gray-400 text-sm">Receive</span>
        </div>
      )}

      {/* Withdraw Button - only shown in EXECUTING state */}
      {isExecuting && (
        <div className="flex flex-col items-center w-20">
          <button
            className="w-10 h-10 bg-[#FFFFFF14] hover:bg-[#FFFFFF1A] rounded-full flex items-center justify-center mb-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
            onClick={onWithdrawClick}
            disabled={isWithdrawing || rawTotalFunds <= 0}
            title="Withdraw"
          >
            {isWithdrawing ? (
              <svg
                className="animate-spin h-5 w-5 text-white"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                width="20"
                height="20"
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
            ) : (
              <FaArrowUp className="w-5 h-5 text-white" />
            )}
          </button>
          <span className="text-gray-400 text-sm">Withdraw</span>
        </div>
      )}

      {/* Distribute Button - only shown in EXECUTING state */}
      {isExecuting && (
        <div className="flex flex-col items-center w-20">
          <button
            className="w-10 h-10 bg-[#FFFFFF14] hover:bg-[#FFFFFF1A] rounded-full flex items-center justify-center mb-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
            onClick={onDistributeClick}
            disabled={isDistributing || revenueAccumulated <= 0}
            title="Distribute"
          >
            {isDistributing ? (
              <svg
                className="animate-spin h-5 w-5 text-white"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                width="20"
                height="20"
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
            ) : (
              <FaDollarSign className="w-5 h-5 text-white" size={20} />
            )}
          </button>
          <span className="text-gray-400 text-sm">Distribute</span>
        </div>
      )}
    </div>
  );
}
