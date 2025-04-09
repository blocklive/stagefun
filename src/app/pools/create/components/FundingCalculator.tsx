import React, { useMemo } from "react";
import { Tier } from "../types";
import { calculateMaxPossibleFunding } from "../hooks/calculateMaxFunding";

interface FundingCalculatorProps {
  tiers: Tier[];
  fundingGoal: string;
}

export const FundingCalculator: React.FC<FundingCalculatorProps> = ({
  tiers,
  fundingGoal,
}) => {
  const { maxPossibleFunding, tierBreakdown } = useMemo(() => {
    return calculateMaxPossibleFunding(tiers);
  }, [tiers]);

  const formattedMax = maxPossibleFunding.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  const goalAmount = parseFloat(fundingGoal || "0");
  const isGoalReachable =
    !isNaN(goalAmount) && maxPossibleFunding >= goalAmount;
  const percentOfGoal =
    goalAmount > 0 ? Math.min(100, (maxPossibleFunding / goalAmount) * 100) : 0;

  // Don't render if we have no funding goal and no tiers (nothing to calculate)
  if (goalAmount === 0 && tiers.length === 0) {
    return null;
  }

  // If we have a goal but no tiers, show a message
  if (goalAmount > 0 && tiers.length === 0) {
    return (
      <div className="mt-4 mb-2 p-4 bg-[#FFFFFF0A] rounded-lg">
        <div className="flex justify-between items-center mb-2">
          <h3 className="text-sm font-medium text-white">
            Maximum Possible Funding
          </h3>
          <div className="flex items-center">
            <span className="text-md font-semibold text-[#F87171]">
              0.00 USDC
            </span>
          </div>
        </div>

        {/* Progress bar showing 0% progress */}
        <div className="mb-3">
          <div className="w-full bg-[#FFFFFF14] rounded-full h-2.5">
            <div
              className="h-2.5 rounded-full bg-[#F87171]"
              style={{ width: "0%" }}
            ></div>
          </div>
          <div className="flex justify-between mt-1 text-xs text-gray-400">
            <span>0 USDC</span>
            <span>{goalAmount.toLocaleString()} USDC Goal</span>
          </div>
        </div>

        {/* Warning message for no tiers */}
        <div className="p-2 mb-3 bg-[#F871711A] border border-[#F87171] rounded-md">
          <p className="text-[#F87171] text-sm">
            You need to add at least one tier below to make your funding goal
            achievable.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-4 mb-2 p-4 bg-[#FFFFFF0A] rounded-lg">
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-sm font-medium text-white">
          Maximum Possible Funding
        </h3>
        <div className="flex items-center">
          <span
            className={`text-md font-semibold ${
              isGoalReachable ? "text-[#22C55E]" : "text-[#F87171]"
            }`}
          >
            {formattedMax} USDC
          </span>
        </div>
      </div>

      {/* Progress bar showing how much of the goal can be covered */}
      {goalAmount > 0 && (
        <div className="mb-3">
          <div className="w-full bg-[#FFFFFF14] rounded-full h-2.5">
            <div
              className={`h-2.5 rounded-full ${
                isGoalReachable ? "bg-[#22C55E]" : "bg-[#F87171]"
              }`}
              style={{ width: `${percentOfGoal}%` }}
            ></div>
          </div>
          <div className="flex justify-between mt-1 text-xs text-gray-400">
            <span>0 USDC</span>
            <span>{goalAmount.toLocaleString()} USDC Goal</span>
          </div>
        </div>
      )}

      {/* Warning message if goal is unreachable */}
      {!isGoalReachable && goalAmount > 0 && (
        <div className="p-2 mb-3 bg-[#F871711A] border border-[#F87171] rounded-md">
          <p className="text-[#F87171] text-sm">
            Based on your current tier configuration, the maximum funding
            possible is {formattedMax} USDC which is{" "}
            {(goalAmount - maxPossibleFunding).toLocaleString()} USDC short of
            your goal. To fix this, you can:
          </p>
          <ul className="text-[#F87171] text-sm mt-1 ml-4 list-disc">
            <li>Increase tier prices</li>
            <li>Increase maximum patron counts</li>
            <li>Add more tiers</li>
            <li>Lower your funding goal</li>
          </ul>
        </div>
      )}

      {/* Tier breakdown accordion (collapsed by default) */}
      {tierBreakdown.length > 0 && (
        <details className="group">
          <summary className="flex items-center justify-between cursor-pointer list-none text-sm text-gray-300 hover:text-white">
            <span>Tier Breakdown</span>
            <span className="transition group-open:rotate-180">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="6 9 12 15 18 9"></polyline>
              </svg>
            </span>
          </summary>
          <div className="mt-2 space-y-1 text-sm text-gray-300">
            {tierBreakdown.map((tier) => (
              <div key={tier.name} className="flex justify-between">
                <span>{tier.name}</span>
                <span>{tier.contribution.toLocaleString()} USDC</span>
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  );
};
