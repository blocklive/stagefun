import React from "react";

interface PoolStatusCardProps {
  poolExists: boolean | undefined;
  tokenASymbol?: string;
  tokenBSymbol?: string;
  displayRatio?: string | null;
}

export function PoolStatusCard({
  poolExists,
  tokenASymbol,
  tokenBSymbol,
  displayRatio,
}: PoolStatusCardProps) {
  if (poolExists === undefined) return null;

  return (
    <div
      className={`mb-4 p-3 rounded-lg ${
        poolExists
          ? "bg-blue-900/30 text-blue-400 border border-blue-800/50"
          : "bg-yellow-900/30 text-yellow-400 border border-yellow-800/50"
      }`}
    >
      {poolExists ? (
        <div className="flex items-start">
          <svg
            className="w-5 h-5 mr-2 mt-0.5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <div>
            <span className="font-medium">Existing Pool</span>
            <p className="text-xs mt-1">
              Tokens will be added according to the current pool ratio.
            </p>
            {displayRatio && tokenASymbol && tokenBSymbol && (
              <p className="text-xs mt-2 font-medium">
                Pool Ratio: 1 {tokenASymbol} = {displayRatio} {tokenBSymbol}
              </p>
            )}
          </div>
        </div>
      ) : (
        <div className="flex items-center">
          <svg
            className="w-5 h-5 mr-2"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
          <div>
            <span className="font-medium">New or Empty Pool</span>
            <p className="text-xs mt-1">
              You are creating a new pool or resetting an empty one. Your input
              will set the price ratio.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
