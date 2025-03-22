import React from "react";

interface FundingSectionProps {
  fundingGoal: string;
  capAmount: string;
  minCommitment: string;
  onFundingGoalChange: (value: string) => void;
  onCapAmountChange: (value: string) => void;
  onMinCommitmentChange: (value: string) => void;
}

export const FundingSection: React.FC<FundingSectionProps> = ({
  fundingGoal,
  capAmount,
  minCommitment,
  onFundingGoalChange,
  onCapAmountChange,
  onMinCommitmentChange,
}) => {
  return (
    <div className="mb-6">
      <h2 className="text-2xl font-bold mb-4">Funding</h2>

      {/* Funding Goal */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-400 mb-2">
          Funding Goal (USDC)
        </label>
        <input
          type="number"
          placeholder="Enter funding goal"
          value={fundingGoal}
          onChange={(e) => onFundingGoalChange(e.target.value)}
          className="w-full p-4 bg-[#FFFFFF14] rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#836EF9]"
          min="0"
          step="0.01"
        />
      </div>

      {/* Cap Amount */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-400 mb-2">
          Cap Amount (USDC)
        </label>
        <input
          type="number"
          placeholder="Enter cap amount"
          value={capAmount}
          onChange={(e) => onCapAmountChange(e.target.value)}
          className="w-full p-4 bg-[#FFFFFF14] rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#836EF9]"
          min="0"
          step="0.01"
        />
        <p className="mt-1 text-sm text-gray-400">
          Maximum amount that can be raised. Must be greater than the funding
          goal.
        </p>
      </div>

      {/* Minimum Commitment */}
      <div>
        <label className="block text-sm font-medium text-gray-400 mb-2">
          Minimum Commitment (USDC)
        </label>
        <input
          type="number"
          placeholder="Enter minimum commitment"
          value={minCommitment}
          onChange={(e) => onMinCommitmentChange(e.target.value)}
          className="w-full p-4 bg-[#FFFFFF14] rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#836EF9]"
          min="0"
          step="0.01"
        />
        <p className="mt-1 text-sm text-gray-400">
          Minimum amount that can be committed to the pool.
        </p>
      </div>
    </div>
  );
};

export default FundingSection;
