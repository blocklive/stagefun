import React from "react";

interface PoolDetailsSectionProps {
  poolName: string;
  ticker: string;
  patrons: string;
  onPoolNameChange: (value: string) => void;
  onTickerChange: (value: string) => void;
  onPatronsChange: (value: string) => void;
}

export const PoolDetailsSection: React.FC<PoolDetailsSectionProps> = ({
  poolName,
  ticker,
  patrons,
  onPoolNameChange,
  onTickerChange,
  onPatronsChange,
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

      {/* Patrons */}
      <div className="mb-6">
        <input
          type="text"
          placeholder="Patrons"
          name="patrons"
          value={patrons}
          onChange={(e) => onPatronsChange(e.target.value)}
          className="w-full p-4 bg-[#FFFFFF14] rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#836EF9]"
        />
      </div>
    </>
  );
};

export default PoolDetailsSection;
