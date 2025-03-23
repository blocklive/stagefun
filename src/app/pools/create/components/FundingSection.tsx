import React, { useEffect } from "react";

interface FundingSectionProps {
  fundingGoal: string;
  capAmount: string;
  onFundingGoalChange: (value: string) => void;
  onCapAmountChange: (value: string) => void;
}

export const FundingSection: React.FC<FundingSectionProps> = ({
  fundingGoal,
  capAmount,
  onFundingGoalChange,
  onCapAmountChange,
}) => {
  const [hasCap, setHasCap] = React.useState(true); // Default to true

  // Update cap amount when funding goal changes or when cap is toggled
  useEffect(() => {
    if (hasCap && fundingGoal) {
      const goal = parseFloat(fundingGoal);
      if (!isNaN(goal)) {
        const newCap = goal * 1.2;
        onCapAmountChange(newCap.toString());
      }
    }
  }, [fundingGoal, hasCap, onCapAmountChange]);

  // When toggling cap on/off
  const handleCapToggle = (enabled: boolean) => {
    setHasCap(enabled);
    if (!enabled) {
      onCapAmountChange("0"); // Set to 0 for no cap
    } else if (fundingGoal) {
      // Set to 20% more than goal when enabling
      const goal = parseFloat(fundingGoal);
      if (!isNaN(goal)) {
        const newCap = goal * 1.2;
        onCapAmountChange(newCap.toString());
      }
    }
  };

  return (
    <div className="mb-6">
      <h2 className="text-2xl font-bold mb-4">Funding</h2>

      {/* Funding Goal Input */}
      <div className="mb-4">
        <input
          type="number"
          placeholder="Funding Goal (USDC)"
          value={fundingGoal}
          onChange={(e) => onFundingGoalChange(e.target.value)}
          className="w-full p-4 bg-[#FFFFFF14] rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#836EF9]"
          min="0"
          step="0.01"
        />
      </div>

      {/* Cap Toggle */}
      <div className="mb-4 flex items-center">
        <label className="flex items-center cursor-pointer">
          <div className="relative">
            <input
              type="checkbox"
              className="sr-only"
              checked={hasCap}
              onChange={(e) => handleCapToggle(e.target.checked)}
            />
            <div
              className={`w-10 h-6 bg-gray-400 rounded-full shadow-inner ${
                hasCap ? "bg-[#836EF9]" : ""
              }`}
            ></div>
            <div
              className={`absolute w-4 h-4 bg-white rounded-full shadow -left-1 top-1 transition ${
                hasCap ? "transform translate-x-full" : ""
              }`}
            ></div>
          </div>
          <span className="ml-3 text-white">Enable Cap</span>
        </label>
      </div>

      {/* Cap Amount Input (only shown if cap is enabled) */}
      {hasCap && (
        <div>
          <input
            type="number"
            placeholder="Cap Amount (USDC)"
            value={capAmount}
            onChange={(e) => onCapAmountChange(e.target.value)}
            className="w-full p-4 bg-[#FFFFFF14] rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#836EF9]"
            min={fundingGoal}
            step="0.01"
          />
          <p className="text-sm text-gray-400 mt-2">
            Cap amount must be greater than or equal to the funding goal
          </p>
        </div>
      )}
    </div>
  );
};

export default FundingSection;
