import React, { useEffect } from "react";
import { USDCInput } from "@/app/components/FloatingLabelInput";
import { Tier } from "../types";

interface FundingSectionProps {
  fundingGoal: string;
  capAmount: string;
  onFundingGoalChange: (value: string) => void;
  onCapAmountChange: (value: string) => void;
  tiers?: Tier[];
}

export const FundingSection: React.FC<FundingSectionProps> = ({
  fundingGoal,
  capAmount,
  onFundingGoalChange,
  onCapAmountChange,
  tiers = [],
}) => {
  const [hasCap, setHasCap] = React.useState(true); // Default to true (capped)

  // Update cap amount when funding goal changes or when cap mode changes
  useEffect(() => {
    if (hasCap) {
      if (fundingGoal && fundingGoal !== "") {
        const goal = parseFloat(fundingGoal);
        if (!isNaN(goal)) {
          // If we're in capped mode and no cap has been set yet or cap is less than goal,
          // set cap to 20% higher than goal
          const currentCap = parseFloat(capAmount);
          if (isNaN(currentCap) || currentCap < goal) {
            const newCap = goal * 1.2;
            onCapAmountChange(newCap.toString());
          }
        } else {
          onCapAmountChange("");
        }
      } else {
        onCapAmountChange("");
      }
    } else {
      // For uncapped mode, we set the cap to zero (representing no cap)
      onCapAmountChange("0");
    }
  }, [fundingGoal, hasCap, onCapAmountChange, capAmount]);

  // Handle funding mode change
  const handleFundingModeChange = (isCapped: boolean) => {
    setHasCap(isCapped);

    // Set default values if none exist
    if (fundingGoal === "0" || fundingGoal === "") {
      onFundingGoalChange("100");
    }

    // When switching to uncapped mode, set cap to 0
    if (!isCapped) {
      onCapAmountChange("0");
    }
    // When switching to capped mode and no cap value, set to 20% more than goal
    else if (capAmount === "0" || capAmount === "") {
      const goal = parseFloat(fundingGoal || "100");
      if (!isNaN(goal)) {
        onCapAmountChange((goal * 1.2).toString());
      }
    }
  };

  // Incremental buttons for number inputs
  const createIncrementalButtons = (
    value: string,
    onChange: (value: string) => void,
    minValue: number = 0
  ) => {
    return (
      <div className="flex flex-col gap-1">
        <button
          type="button"
          className="w-6 h-6 bg-[#FFFFFF14] hover:bg-[#FFFFFF1A] rounded-md flex items-center justify-center focus:outline-none transition-colors"
          onClick={() => {
            const currentValue = parseFloat(value);
            if (!isNaN(currentValue)) {
              onChange((currentValue + 1).toString());
            } else {
              onChange("1");
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
            const currentValue = parseFloat(value);
            if (!isNaN(currentValue) && currentValue > minValue) {
              onChange((currentValue - 1).toString());
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
    );
  };

  return (
    <div className="space-y-6">
      {/* Funding Mode Selector */}
      <div>
        <label className="block text-sm font-medium text-gray-400 mb-2">
          Funding Mode
        </label>
        <div className="flex gap-2 mb-3">
          <button
            type="button"
            className={`flex-1 px-4 py-2 rounded-lg ${
              hasCap
                ? "bg-[#836EF9] text-white"
                : "bg-[#FFFFFF14] text-gray-300 hover:bg-[#FFFFFF24]"
            } transition-colors`}
            onClick={() => handleFundingModeChange(true)}
          >
            Capped
          </button>
          <button
            type="button"
            className={`flex-1 px-4 py-2 rounded-lg ${
              !hasCap
                ? "bg-[#836EF9] text-white"
                : "bg-[#FFFFFF14] text-gray-300 hover:bg-[#FFFFFF24]"
            } transition-colors`}
            onClick={() => handleFundingModeChange(false)}
          >
            Uncapped
          </button>
        </div>
        {hasCap ? (
          <p className="text-sm text-gray-400 mt-2">
            The pool will stop accepting contributions once the funding cap is
            reached.
          </p>
        ) : (
          <p className="text-sm text-gray-400 mt-2">
            The pool will continue accepting contributions beyond the funding
            goal.
          </p>
        )}
      </div>

      {/* Funding Goal Input - shown for both modes */}
      <div>
        <USDCInput
          value={fundingGoal}
          onChange={(value) => {
            if (value === "" || /^\d*\.?\d*$/.test(value)) {
              onFundingGoalChange(value);

              // If in capped mode and goal is greater than cap, update cap
              if (hasCap) {
                const newGoal = parseFloat(value);
                const currentCap = parseFloat(capAmount);
                if (
                  !isNaN(newGoal) &&
                  !isNaN(currentCap) &&
                  newGoal > currentCap
                ) {
                  onCapAmountChange((newGoal * 1.2).toString());
                }
              }
            }
          }}
          placeholder="Funding Goal"
          rightElements={createIncrementalButtons(
            fundingGoal,
            onFundingGoalChange
          )}
        />
        <p className="text-sm text-gray-400 mt-2">
          The minimum amount needed for the funding to be considered successful.
        </p>
      </div>

      {/* Funding Cap Input - only shown for capped mode */}
      {hasCap && (
        <div>
          <USDCInput
            value={capAmount}
            onChange={(value) => {
              if (value === "" || /^\d*\.?\d*$/.test(value)) {
                onCapAmountChange(value);
              }
            }}
            placeholder="Funding Cap"
            rightElements={createIncrementalButtons(
              capAmount,
              onCapAmountChange,
              parseFloat(fundingGoal) || 0
            )}
          />
          <p className="text-sm text-gray-400 mt-2">
            The maximum amount of funding that can be collected. Must be greater
            than or equal to the funding goal.
          </p>
        </div>
      )}
    </div>
  );
};

export default FundingSection;
