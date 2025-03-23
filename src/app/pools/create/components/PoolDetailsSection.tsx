import React from "react";

interface PoolDetailsSectionProps {
  poolName: string;
  ticker: string;
  onPoolNameChange: (value: string) => void;
  onTickerChange: (value: string) => void;
}

export const PoolDetailsSection: React.FC<PoolDetailsSectionProps> = ({
  poolName,
  ticker,
  onPoolNameChange,
  onTickerChange,
}) => {
  return (
    <>
      {/* Pool Name Input */}
      <div className="mb-6">
        <input
          type="text"
          placeholder="Party Round Name"
          name="name"
          value={poolName}
          onChange={(e) => onPoolNameChange(e.target.value)}
          className="w-full p-4 bg-[#FFFFFF14] rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#836EF9]"
        />
      </div>

      {/* Sticker Input */}
      <div className="mb-6">
        <input
          type="text"
          placeholder="$TICKER"
          name="ticker"
          value={ticker}
          onChange={(e) => onTickerChange(e.target.value)}
          className="w-full p-4 bg-[#FFFFFF14] rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#836EF9]"
        />
      </div>
    </>
  );
};

export default PoolDetailsSection;
