import React, { useEffect } from "react";
import { USDCInput } from "@/app/components/FloatingLabelInput";
import { Tier } from "../types";
import { MINIMUM_FUNDING_GOAL, MINIMUM_PRICE } from "@/lib/constants/pricing";
import { MAX_SAFE_VALUE } from "@/lib/utils/contractValues";

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
  const [fundingGoalError, setFundingGoalError] = React.useState<string | null>(
    null
  );
  const [capAmountError, setCapAmountError] = React.useState<string | null>(
    null
  );
  const [hasManuallyEditedCap, setHasManuallyEditedCap] = React.useState(false);

  // Validate funding goal and cap amounts
  useEffect(() => {
    // Validate funding goal
    const goalAmount = parseFloat(fundingGoal);
    if (!isNaN(goalAmount) && goalAmount < MINIMUM_FUNDING_GOAL) {
      setFundingGoalError(
        `Funding goal must be at least ${MINIMUM_FUNDING_GOAL} USDC`
      );
    } else {
      setFundingGoalError(null);
    }

    // Validate cap amount if in capped mode
    if (hasCap) {
      const capVal = parseFloat(capAmount);
      const goalVal = parseFloat(fundingGoal);

      if (!isNaN(capVal) && !isNaN(goalVal) && capVal < goalVal) {
        setCapAmountError("Cap must be at least equal to the funding goal");
      } else if (!isNaN(capVal) && capVal < MINIMUM_FUNDING_GOAL) {
        setCapAmountError(`Cap must be at least ${MINIMUM_FUNDING_GOAL} USDC`);
      } else {
        setCapAmountError(null);
      }
    } else {
      setCapAmountError(null);
    }
  }, [fundingGoal, capAmount, hasCap]);

  // Update cap amount when funding goal changes or when cap mode changes
  useEffect(() => {
    // Only auto-update if the user hasn't manually edited the cap
    if (hasCap && !hasManuallyEditedCap) {
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
    } else if (!hasCap) {
      // For uncapped mode, we set the cap to MAX_SAFE_VALUE (representing no cap)
      onCapAmountChange(MAX_SAFE_VALUE);
    }
  }, [fundingGoal, hasCap, onCapAmountChange, capAmount, hasManuallyEditedCap]);

  // Handle funding mode change
  const handleFundingModeChange = (isCapped: boolean) => {
    setHasCap(isCapped);

    // Set default values if none exist
    if (fundingGoal === "0" || fundingGoal === "") {
      onFundingGoalChange(MINIMUM_FUNDING_GOAL.toString());
    }

    // When switching to uncapped mode, set cap to MAX_SAFE_VALUE
    if (!isCapped) {
      onCapAmountChange(MAX_SAFE_VALUE);
    }
    // When switching to capped mode and no cap value, set to 20% more than goal
    else if (
      capAmount === MAX_SAFE_VALUE ||
      capAmount === "0" ||
      capAmount === ""
    ) {
      const goal = parseFloat(fundingGoal || MINIMUM_FUNDING_GOAL.toString());
      if (!isNaN(goal)) {
        onCapAmountChange(
          (Math.max(goal, MINIMUM_FUNDING_GOAL) * 1.2).toString()
        );
      }
      // Reset the manual edit flag when switching to capped mode
      setHasManuallyEditedCap(false);
    }
  };

  // Incremental buttons for number inputs
  const createIncrementalButtons = (
    value: string,
    onChange: (value: string) => void,
    minValue: number = MINIMUM_FUNDING_GOAL
  ) => {
    return (
      <div className="flex flex-col gap-1">
        <button
          type="button"
          className="w-6 h-6 bg-[#FFFFFF14] hover:bg-[#FFFFFF1A] rounded-md flex items-center justify-center focus:outline-none transition-colors"
          onClick={() => {
            const currentValue = parseFloat(value);
            if (!isNaN(currentValue)) {
              onChange((currentValue + 0.01).toString());
              if (onChange === onCapAmountChange) {
                setHasManuallyEditedCap(true);
              }
            } else {
              onChange(MINIMUM_FUNDING_GOAL.toString());
              if (onChange === onCapAmountChange) {
                setHasManuallyEditedCap(true);
              }
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
            if (!isNaN(currentValue) && currentValue > minValue + 0.01) {
              onChange((currentValue - 0.01).toString());
              if (onChange === onCapAmountChange) {
                setHasManuallyEditedCap(true);
              }
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
              // Only auto-update if the user hasn't manually edited the cap
              if (hasCap && !hasManuallyEditedCap) {
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
            onFundingGoalChange,
            MINIMUM_FUNDING_GOAL
          )}
        />
        {fundingGoalError && (
          <p className="text-xs text-red-500 mt-1">{fundingGoalError}</p>
        )}
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
                setHasManuallyEditedCap(true);
              }
            }}
            placeholder="Funding Cap"
            rightElements={createIncrementalButtons(
              capAmount,
              onCapAmountChange,
              Math.max(
                parseFloat(fundingGoal) || MINIMUM_FUNDING_GOAL,
                MINIMUM_FUNDING_GOAL
              )
            )}
          />
          {capAmountError && (
            <p className="text-xs text-red-500 mt-1">{capAmountError}</p>
          )}
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
