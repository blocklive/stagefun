import React from "react";

interface FundingSectionProps {
  fundingGoal: string;
  minCommitment: string;
  onFundingGoalChange: (value: string) => void;
  onMinCommitmentChange: (value: string) => void;
}

export const FundingSection: React.FC<FundingSectionProps> = ({
  fundingGoal,
  minCommitment,
  onFundingGoalChange,
  onMinCommitmentChange,
}) => {
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

      {/* Minimum Commitment */}
      <div className="mb-6">
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
            placeholder="Minimum commitment"
            name="minCommitment"
            value={minCommitment}
            onChange={(e) => {
              // Only allow numbers and a single decimal point
              const value = e.target.value;
              if (value === "" || /^\d*\.?\d*$/.test(value)) {
                onMinCommitmentChange(value);
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
                const currentValue = parseFloat(minCommitment) || 0;
                onMinCommitmentChange((currentValue + 0.1).toFixed(1));
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
                const currentValue = parseFloat(minCommitment) || 0;
                if (currentValue > 0.1) {
                  onMinCommitmentChange((currentValue - 0.1).toFixed(1));
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
    </>
  );
};

export default FundingSection;
