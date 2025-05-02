import React from "react";

interface SlippageSettingsProps {
  slippageTolerance: string;
  onChange: (value: string) => void;
}

export function SlippageSettings({
  slippageTolerance,
  onChange,
}: SlippageSettingsProps) {
  const handleSlippageChange = (value: string) => {
    if (value === "" || /^\d*\.?\d*$/.test(value)) {
      if (value === "" || parseFloat(value) <= 100) {
        onChange(value);
      }
    }
  };

  return (
    <div className="mb-6 p-3 bg-gray-800 rounded-lg">
      <div className="flex justify-between items-center">
        <span className="text-sm text-gray-400">Slippage tolerance</span>
        <div className="flex items-center">
          <input
            type="text"
            value={slippageTolerance}
            onChange={(e) => handleSlippageChange(e.target.value)}
            className="w-12 px-2 py-1 text-right bg-gray-700 border border-gray-600 rounded-md text-white text-sm"
          />
          <span className="ml-1 text-sm text-gray-300">%</span>
        </div>
      </div>
    </div>
  );
}
