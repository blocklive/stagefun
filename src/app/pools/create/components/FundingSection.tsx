import React, { useEffect } from "react";
import Image from "next/image";

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
    if (hasCap) {
      if (fundingGoal && fundingGoal !== "") {
        const goal = parseFloat(fundingGoal);
        if (!isNaN(goal)) {
          const newCap = goal * 1.2;
          onCapAmountChange(newCap.toString());
        } else {
          onCapAmountChange("");
        }
      } else {
        onCapAmountChange("");
      }
    }
  }, [fundingGoal, hasCap, onCapAmountChange]);

  // When toggling cap on/off
  const handleCapToggle = (enabled: boolean) => {
    setHasCap(enabled);
    if (!enabled) {
      onCapAmountChange("0"); // Set to "0" explicitly when cap is disabled to represent unlimited cap
    } else if (fundingGoal) {
      // Set to 20% more than goal when enabling
      const goal = parseFloat(fundingGoal);
      if (!isNaN(goal)) {
        const newCap = goal * 1.2;
        onCapAmountChange(newCap.toString());
      } else {
        onCapAmountChange(""); // Set to empty string if goal is not a valid number
      }
    } else {
      onCapAmountChange(""); // Set to empty string if no funding goal
    }
  };

  return (
    <div className="space-y-6">
      {/* Funding Goal Input */}
      <div>
        <div className="flex gap-4">
          {/* Amount Input */}
          <div className="flex-1 relative">
            <div className="absolute left-4 top-1/2 transform -translate-y-1/2">
              <Image
                src="/images/usdc-logo.svg"
                alt="USDC"
                width={24}
                height={24}
              />
            </div>
            <input
              type="text"
              inputMode="decimal"
              pattern="[0-9]*\.?[0-9]*"
              placeholder="Funding Goal"
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
                  const currentValue = parseFloat(fundingGoal);
                  if (!isNaN(currentValue)) {
                    onFundingGoalChange((currentValue + 1).toString());
                  } else {
                    onFundingGoalChange("1");
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
                  const currentValue = parseFloat(fundingGoal);
                  if (!isNaN(currentValue) && currentValue > 0) {
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
        </div>
      </div>

      {/* Cap Toggle */}
      <div className="flex items-center">
        <label className="flex items-center cursor-pointer">
          <div className="relative">
            <input
              type="checkbox"
              className="sr-only"
              checked={hasCap}
              onChange={(e) => handleCapToggle(e.target.checked)}
            />
            <div
              className={`w-10 h-6 rounded-full shadow-inner transition-colors ${
                hasCap ? "bg-[#836EF9]" : "bg-gray-600"
              }`}
            ></div>
            <div
              className={`absolute w-4 h-4 bg-white rounded-full shadow transition-transform ${
                hasCap ? "translate-x-4" : "translate-x-1"
              } top-1`}
            ></div>
          </div>
          <span className="ml-3 text-white">Enable Cap</span>
        </label>
      </div>

      {/* Cap Amount Input (only shown if cap is enabled) */}
      {hasCap && (
        <div>
          <div className="relative">
            <div className="absolute left-4 top-1/2 transform -translate-y-1/2">
              <Image
                src="/images/usdc-logo.svg"
                alt="USDC"
                width={24}
                height={24}
              />
            </div>
            <input
              type="text"
              inputMode="decimal"
              pattern="[0-9]*\.?[0-9]*"
              placeholder="Funding Cap"
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
                  const currentValue = parseFloat(capAmount);
                  if (!isNaN(currentValue)) {
                    onCapAmountChange((currentValue + 1).toString());
                  } else {
                    onCapAmountChange("1");
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
                  const currentValue = parseFloat(capAmount);
                  const goalValue = parseFloat(fundingGoal || "");
                  if (
                    !isNaN(currentValue) &&
                    (!goalValue || currentValue >= goalValue)
                  ) {
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
          <p className="text-sm text-gray-400 mt-2">
            Cap amount must be greater than or equal to the funding goal. To
            disable the cap completely, toggle off "Enable Cap" above.
          </p>
        </div>
      )}
    </div>
  );
};

export default FundingSection;
