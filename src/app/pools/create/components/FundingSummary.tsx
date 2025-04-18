import React, { useMemo } from "react";
import { Tier } from "../types";
import {
  calculateMaxPossibleFunding,
  UNLIMITED_FUNDING,
} from "../hooks/calculateMaxFunding";
import { CheckCircleIcon, XCircleIcon } from "@heroicons/react/24/solid";
import { colors } from "@/lib/theme";
import { FC } from "react";

interface FundingSummaryProps {
  tiers: Tier[];
  fundingGoal: string;
  capAmount?: string;
}

// Using PostgreSQL's max bigint value which is safe for both database and contract
export const MAX_SAFE_VALUE = "9223372036854775807";

export const FundingSummary: React.FC<FundingSummaryProps> = ({
  tiers,
  fundingGoal,
  capAmount = "0",
}) => {
  const { maxPossibleFunding, tierBreakdown, isUnlimited } = useMemo(() => {
    return calculateMaxPossibleFunding(tiers.filter((t) => t.isActive));
  }, [tiers]);

  const goalAmount = parseFloat(fundingGoal || "0");
  const capValue = parseFloat(capAmount || "0");

  // Ensure maxDisplayFunding respects the cap if set
  const maxDisplayFunding = useMemo(() => {
    // If unlimited funding potential and no cap set
    if (isUnlimited && capValue <= 0) {
      return UNLIMITED_FUNDING;
    }

    // If unlimited potential but a cap is set, use the cap
    if (isUnlimited && capValue > 0) {
      return capValue;
    }

    // If limited potential but exceeds cap, use cap value
    if (capValue > 0 && maxPossibleFunding > capValue) {
      return capValue;
    }

    // Otherwise use calculated maximum
    return maxPossibleFunding;
  }, [maxPossibleFunding, capValue, isUnlimited]);

  // Format the maximum funding for display
  const formattedMax = useMemo(() => {
    if (maxDisplayFunding === UNLIMITED_FUNDING) {
      return "Unlimited";
    }
    return maxDisplayFunding.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }, [maxDisplayFunding]);

  const formattedGoal = goalAmount.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  const formattedCap =
    capValue > 0
      ? capValue.toLocaleString("en-US", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }) + " USDC"
      : "No Cap";

  // A goal is reachable if we have unlimited funding or if the max funding meets/exceeds the goal
  const isGoalReachable =
    !isNaN(goalAmount) &&
    (maxDisplayFunding === UNLIMITED_FUNDING ||
      maxDisplayFunding >= goalAmount);

  // Determine percent of goal (set to 100% if unlimited)
  const percentOfGoal = useMemo(() => {
    if (maxDisplayFunding === UNLIMITED_FUNDING) return 100;
    if (goalAmount <= 0) return 0;
    return Math.min(100, (maxDisplayFunding / goalAmount) * 100);
  }, [maxDisplayFunding, goalAmount]);

  // Don't render if we have no funding goal and no tiers (nothing to calculate)
  if (goalAmount === 0 && tiers.length === 0) {
    return null;
  }

  // If we have a goal but no tiers, show a message
  if (goalAmount > 0 && tiers.length === 0) {
    return (
      <div className="mt-4 p-6 bg-[#FFFFFF0A] rounded-lg border border-[#F87171] shadow-lg">
        <div className="flex justify-end items-center mb-3">
          <div className="flex items-center">
            <span className="text-sm text-gray-300 mr-2">
              Maximum Possible Funding:
            </span>
            <span className="text-md font-semibold text-[#F87171]">
              0.00 USDC
            </span>
          </div>
        </div>

        {/* Progress bar showing 0% progress */}
        <div className="mb-4">
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
        <div className="p-4 mb-3 bg-[#F871711A] border border-[#F87171] rounded-md">
          <div className="flex items-start">
            <XCircleIcon className="w-6 h-6 text-[#F87171] mr-2 flex-shrink-0" />
            <div>
              <p className="text-[#F87171] text-sm font-medium">
                You need to add at least one tier to make your funding goal
                achievable.
              </p>
              <p className="text-gray-400 text-xs mt-1">
                Add tiers in the section above to ensure your funding goal can
                be reached.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-4 p-6 bg-[#FFFFFF0A] rounded-lg border border-[#FFFFFF1A] shadow-lg">
      {/* Funding Statistics */}
      <div className="grid grid-cols-3 gap-4 mb-4">
        <div className="p-3 bg-[#FFFFFF08] rounded-md">
          <div className="text-xs text-gray-400 mb-1">Target Goal</div>
          <div className="text-md font-semibold text-white">
            {formattedGoal} USDC
          </div>
        </div>
        <div className="p-3 bg-[#FFFFFF08] rounded-md">
          <div className="text-xs text-gray-400 mb-1">Funding Cap</div>
          <div className="text-md font-semibold text-white">{formattedCap}</div>
        </div>
        <div className="p-3 bg-[#FFFFFF08] rounded-md">
          <div className="text-xs text-gray-400 mb-1">Maximum Funding</div>
          <div
            className={`text-md font-semibold ${
              isGoalReachable ? "text-[#9EEB00]" : "text-[#F87171]"
            }`}
          >
            {formattedMax}
            {maxDisplayFunding === UNLIMITED_FUNDING ? "" : " USDC"}
          </div>
        </div>
      </div>

      {/* Progress bar showing how much of the goal can be covered - only show when goal is not yet reached */}
      {goalAmount > 0 && !isGoalReachable && (
        <div className="mb-4">
          <div className="w-full bg-[#FFFFFF14] rounded-full h-2.5">
            <div
              className="h-2.5 rounded-full bg-[#F87171]"
              style={{ width: `${percentOfGoal}%` }}
            ></div>
          </div>
          <div className="flex justify-between mt-1 text-xs text-gray-400">
            <span>0 USDC</span>
            <span>{goalAmount.toLocaleString()} USDC Goal</span>
          </div>
        </div>
      )}

      {/* Validation result */}
      <div
        className={`p-4 mb-4 ${
          isGoalReachable
            ? "bg-[#0F1A00] border border-[#9EEB00]"
            : "bg-[#F871711A] border border-[#F87171]"
        } rounded-md`}
      >
        <div className="flex items-start">
          {isGoalReachable ? (
            <CheckCircleIcon className="w-6 h-6 text-[#9EEB00] mr-2 flex-shrink-0" />
          ) : (
            <XCircleIcon className="w-6 h-6 text-[#F87171] mr-2 flex-shrink-0" />
          )}

          <div>
            {isGoalReachable ? (
              <>
                <p className="text-[#9EEB00] text-sm font-medium">
                  Your funding goal is achievable!
                </p>
                <p className="text-gray-400 text-xs mt-1">
                  With your current tier configuration, you can raise
                  {maxDisplayFunding === UNLIMITED_FUNDING
                    ? " an unlimited amount"
                    : ` up to ${formattedMax} USDC`}
                  .
                  {capValue > 0 && maxPossibleFunding > capValue && (
                    <span> (limited by your funding cap)</span>
                  )}
                </p>
                {maxDisplayFunding >= goalAmount && (
                  <div className="mt-2">
                    <p className="text-gray-400 text-xs mt-1">
                      With the current tier prices, your pool would raise up to{" "}
                      {maxDisplayFunding === UNLIMITED_FUNDING
                        ? "an unlimited amount"
                        : `${formattedMax} USDC`}{" "}
                      if all tiers sell out.
                    </p>
                  </div>
                )}
              </>
            ) : (
              <>
                <p className="text-[#F87171] text-sm font-medium">
                  You can only raise {formattedMax}
                  {maxDisplayFunding === UNLIMITED_FUNDING ? "" : " USDC"} based
                  on your current tier pricing and max patrons toward your goal
                  of {goalAmount.toLocaleString()} USDC
                </p>
                <p className="text-gray-400 text-xs mt-1">
                  This leaves you{" "}
                  {maxDisplayFunding === UNLIMITED_FUNDING
                    ? "0"
                    : (goalAmount - maxDisplayFunding).toLocaleString()}{" "}
                  USDC short of your goal.
                </p>
                <ul className="text-gray-400 text-xs mt-2 ml-4 list-disc space-y-1">
                  <li>Increase tier prices</li>
                  <li>Increase maximum patron counts</li>
                  <li>Add more tiers</li>
                  <li>Lower your funding goal</li>
                </ul>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Tier breakdown accordion (collapsed by default) */}
      {tierBreakdown.length > 0 && (
        <details className="group">
          <summary className="flex items-center justify-between cursor-pointer list-none text-sm text-gray-300 hover:text-white p-2 rounded-md hover:bg-[#FFFFFF0A]">
            <span className="font-medium">Tier Contribution Breakdown</span>
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
          <div className="mt-2 space-y-2 pl-2">
            {tierBreakdown.map((tier) => {
              // Find the original tier to get more details
              const originalTier = tiers.find((t) => t.name === tier.name);
              const price = originalTier?.isVariablePrice
                ? parseFloat(originalTier.maxPrice)
                : parseFloat(originalTier?.price || "0");
              const maxPatrons = parseInt(originalTier?.maxPatrons || "0");

              return (
                <div
                  key={tier.name}
                  className="flex flex-col p-3 bg-[#FFFFFF08] rounded-md"
                >
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-300">{tier.name}</span>
                    <span className="text-sm font-medium text-white">
                      {tier.contribution === Infinity
                        ? "Unlimited"
                        : `${tier.contribution.toLocaleString()} USDC`}
                    </span>
                  </div>
                  <div className="text-xs text-gray-400 mt-1">
                    {originalTier?.isVariablePrice ? "Max price" : "Price"}:{" "}
                    {price === Infinity
                      ? "Unlimited"
                      : `${price.toLocaleString()} USDC`}{" "}
                    ×{" "}
                    {maxPatrons === Infinity
                      ? "Unlimited"
                      : maxPatrons.toLocaleString()}{" "}
                    patrons
                  </div>
                </div>
              );
            })}
          </div>
        </details>
      )}
    </div>
  );
};

export default FundingSummary;
