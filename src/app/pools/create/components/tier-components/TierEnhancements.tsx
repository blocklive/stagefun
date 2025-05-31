import React from "react";
import { Tier } from "../../types";
import { NumericInputWithButtons } from "@/app/components/NumericInputWithButtons";

interface TierEnhancementsProps {
  tier: Tier;
  onUpdateTier: (tierId: string, field: keyof Tier, value: any) => void;
  disabled?: boolean;
}

export const TierEnhancements: React.FC<TierEnhancementsProps> = ({
  tier,
  onUpdateTier,
  disabled = false,
}) => {
  const handleNumericChange = (field: keyof Tier, value: string) => {
    const numericValue = parseFloat(value) || 0;
    onUpdateTier(tier.id, field, numericValue);
  };

  return (
    <div className="mt-6">
      <h4 className="text-lg font-semibold text-white mb-4">
        Investment Benefits
      </h4>
      <p className="text-sm text-gray-400 mb-4">
        Configure special benefits for this tier
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Yield Bonus */}
        <NumericInputWithButtons
          label="Yield Bonus (%)"
          value={tier.yieldBonusPercentage}
          onChange={(value) =>
            handleNumericChange("yieldBonusPercentage", value)
          }
          placeholder="0.5"
          min={0}
          max={10}
          step={0.1}
          disabled={disabled}
          suffix="%"
        />

        {/* Fee Discount */}
        <NumericInputWithButtons
          label="Fee Discount (%)"
          value={tier.feeDiscountPercentage}
          onChange={(value) =>
            handleNumericChange("feeDiscountPercentage", value)
          }
          placeholder="0.2"
          min={0}
          max={100}
          step={0.1}
          disabled={disabled}
          suffix="%"
        />
      </div>

      <div className="mt-4">
        <p className="text-xs text-gray-500">
          <strong>Yield Bonus:</strong> Additional yield percentage above base
          rate
          <br />
          <strong>Fee Discount:</strong> Reduction in management fees
        </p>
      </div>
    </div>
  );
};
