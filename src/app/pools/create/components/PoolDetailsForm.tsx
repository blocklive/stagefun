import React, { useState } from "react";
import FloatingLabelInput from "@/app/components/FloatingLabelInput";

interface PoolDetailsFormProps {
  poolName: string;
  onPoolNameChange: (value: string) => void;
  ticker: string;
  onTickerChange: (value: string) => void;
}

const PoolDetailsForm: React.FC<PoolDetailsFormProps> = ({
  poolName,
  onPoolNameChange,
  ticker,
  onTickerChange,
}) => {
  return (
    <div className="space-y-6">
      <div>
        <FloatingLabelInput
          value={poolName}
          onChange={onPoolNameChange}
          placeholder="Pool Name"
        />
        <p className="text-sm text-gray-400 mt-2">
          The name of your funding pool.
        </p>
      </div>

      <div>
        <FloatingLabelInput
          value={ticker}
          onChange={onTickerChange}
          placeholder="Ticker"
          className="uppercase"
        />
        <p className="text-sm text-gray-400 mt-2">
          A short abbreviation for your pool (1-5 characters).
        </p>
      </div>
    </div>
  );
};

export default PoolDetailsForm;
