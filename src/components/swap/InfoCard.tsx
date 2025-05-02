import React from "react";

interface InfoCardProps {
  poolExists: boolean;
}

export function InfoCard({ poolExists }: InfoCardProps) {
  return (
    <div className="mt-6 p-4 bg-gray-800/50 rounded-lg border border-gray-700">
      <h3 className="text-sm font-medium text-gray-300 mb-2">Information</h3>
      {poolExists ? (
        <>
          <p className="text-xs text-gray-400 mb-2">
            • Adding liquidity to an existing pool must follow the current price
            ratio
          </p>
          <p className="text-xs text-gray-400 mb-2">
            • The second token amount is automatically calculated
          </p>
          <p className="text-xs text-gray-400">
            • LP tokens represent your position and allow you to reclaim your
            assets
          </p>
        </>
      ) : (
        <>
          <p className="text-xs text-gray-400 mb-2">
            • Adding liquidity to this empty pool will set the initial exchange
            rate
          </p>
          <p className="text-xs text-gray-400 mb-2">
            • Empty pools allow you to set any price ratio you want
          </p>
          <p className="text-xs text-gray-400 mb-2">
            • LP tokens represent your position and allow you to reclaim your
            assets
          </p>
          <p className="text-xs text-gray-400">
            • You can add equal values of both tokens for the best results
          </p>
        </>
      )}
    </div>
  );
}
