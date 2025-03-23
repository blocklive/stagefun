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

  // When funding goal changes and cap is enabled, update cap to be 20% more
  useEffect(() => {
    if (hasCap && fundingGoal) {
      const goal = parseFloat(fundingGoal);
      if (!isNaN(goal)) {
        const newCap = goal * 1.2;
        onCapAmountChange(newCap.toString());
      }
    }
  }, [fundingGoal, hasCap]);

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

  // Initialize cap amount when component mounts
  useEffect(() => {
    if (fundingGoal) {
      const goal = parseFloat(fundingGoal);
      if (!isNaN(goal)) {
        const newCap = goal * 1.2;
        onCapAmountChange(newCap.toString());
      }
    }
  }, []); // Empty dependency array means this runs once on mount

  return (
    <>
      {/* Funding Goal Section */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold mb-4">Funding goal</h2>
        <div className="flex gap-4">
          {/* Amount Input */}
          <div className="flex-1 relative">
            <div className="absolute left-4 top-1/2 transform -translate-y-1/2">
              <div className="w-8 h-8 bg-[#836EF9] rounded-full flex items-center justify-center">
                <span className="text-white font-bold">$</span>
              </div>
            </div>
            <input
              type="text"
              inputMode="decimal"
              pattern="[0-9]*\.?[0-9]*"
              placeholder="0"
              name="fundingGoal"
              value={fundingGoal}
              onChange={(e) => {
                // Only allow numbers and a single decimal point
                const value = e.target.value;
                if (value === "" || /^\d*\.?\d*$/.test(value)) {
                  onFundingGoalChange(value);
                }
              }}
              className="w-full p-4 pl-16 bg-[#FFFFFF14] rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#836EF9]"
              style={{ appearance: "textfield" }}
            />
            <div className="absolute right-4 top-1/2 transform -translate-y-1/2 flex flex-col gap-1">
              <button
                type="button"
                className="w-6 h-6 bg-[#FFFFFF14] hover:bg-[#FFFFFF1A] rounded-md flex items-center justify-center focus:outline-none transition-colors"
                onClick={() => {
                  const currentValue = parseFloat(fundingGoal) || 0;
                  onFundingGoalChange((currentValue + 1).toString());
                }}
              >
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M18 15L12 9L6 15"
                    stroke="white"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
              <button
                type="button"
                className="w-6 h-6 bg-[#FFFFFF14] hover:bg-[#FFFFFF1A] rounded-md flex items-center justify-center focus:outline-none transition-colors"
                onClick={() => {
                  const currentValue = parseFloat(fundingGoal) || 0;
                  if (currentValue > 0) {
                    onFundingGoalChange((currentValue - 1).toString());
                  }
                }}
              >
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M6 9L12 15L18 9"
                    stroke="white"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
            </div>
          </div>

          {/* Currency Selector */}
          <div className="relative">
            <div className="h-full px-4 bg-[#FFFFFF14] rounded-lg flex items-center gap-2">
              <div className="w-8 h-8 bg-[#836EF9] rounded-full flex items-center justify-center">
                <span className="text-white font-bold">$</span>
              </div>
              <span>USDC</span>
            </div>
          </div>
        </div>
      </div>

      {/* Cap Amount Toggle and Input */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-4">
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              className="sr-only peer"
              checked={hasCap}
              onChange={(e) => handleCapToggle(e.target.checked)}
            />
            <div className="w-11 h-6 bg-[#FFFFFF14] peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[#836EF9] rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#836EF9]"></div>
            <span className="ml-3 text-sm font-medium text-gray-300">
              Set maximum funding cap
            </span>
          </label>
        </div>

        {hasCap && (
          <>
            <div className="relative">
              <div className="absolute left-4 top-1/2 transform -translate-y-1/2">
                <div className="w-8 h-8 bg-[#836EF9] rounded-full flex items-center justify-center">
                  <span className="text-white font-bold">$</span>
                </div>
              </div>
              <input
                type="text"
                inputMode="decimal"
                pattern="[0-9]*\.?[0-9]*"
                placeholder="Maximum amount that can be raised"
                name="capAmount"
                value={capAmount}
                onChange={(e) => {
                  // Only allow numbers and a single decimal point
                  const value = e.target.value;
                  if (value === "" || /^\d*\.?\d*$/.test(value)) {
                    onCapAmountChange(value);
                  }
                }}
                className="w-full p-4 pl-16 bg-[#FFFFFF14] rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#836EF9]"
                style={{ appearance: "textfield" }}
              />
              <div className="absolute right-4 top-1/2 transform -translate-y-1/2 flex flex-col gap-1">
                <button
                  type="button"
                  className="w-6 h-6 bg-[#FFFFFF14] hover:bg-[#FFFFFF1A] rounded-md flex items-center justify-center focus:outline-none transition-colors"
                  onClick={() => {
                    const currentValue = parseFloat(capAmount) || 0;
                    onCapAmountChange((currentValue + 1).toString());
                  }}
                >
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M18 15L12 9L6 15"
                      stroke="white"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
                <button
                  type="button"
                  className="w-6 h-6 bg-[#FFFFFF14] hover:bg-[#FFFFFF1A] rounded-md flex items-center justify-center focus:outline-none transition-colors"
                  onClick={() => {
                    const currentValue = parseFloat(capAmount) || 0;
                    if (currentValue > 0) {
                      onCapAmountChange((currentValue - 1).toString());
                    }
                  }}
                >
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M6 9L12 15L18 9"
                      stroke="white"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
              </div>
            </div>
            <p className="mt-1 text-sm text-gray-400">
              Must be greater than or equal to the funding goal
            </p>
          </>
        )}
      </div>
    </>
  );
};

export default FundingSection;
