import React, { useState, useEffect } from "react";
import NumberInput from "@/app/components/NumberInput";
import { Tier } from "../../types";

interface TierDetailsFormProps {
  tier: Tier;
  onUpdateTier: (tierId: string, field: keyof Tier, value: any) => void;
  capAmount?: string;
}

export const TierDetailsForm: React.FC<TierDetailsFormProps> = ({
  tier,
  onUpdateTier,
  capAmount = "0",
}) => {
  const [priceError, setPriceError] = useState<string | null>(null);
  const [maxPriceError, setMaxPriceError] = useState<string | null>(null);

  // Validate price against cap whenever price, maxPrice, or capAmount change
  useEffect(() => {
    const capValue = parseFloat(capAmount);

    // Only validate if there's a cap (capAmount > 0)
    if (capValue > 0) {
      // For fixed price tier
      if (!tier.isVariablePrice) {
        const price = parseFloat(tier.price);
        if (!isNaN(price) && price > capValue) {
          setPriceError(
            `Price cannot exceed the funding cap (${capValue} USDC)`
          );
        } else {
          setPriceError(null);
        }
      }
      // For variable price tier, check maxPrice
      else {
        const maxPrice = parseFloat(tier.maxPrice);
        if (!isNaN(maxPrice) && maxPrice > capValue) {
          setMaxPriceError(
            `Max price cannot exceed the funding cap (${capValue} USDC)`
          );
        } else {
          setMaxPriceError(null);
        }
      }
    } else {
      // No cap, so no validation needed
      setPriceError(null);
      setMaxPriceError(null);
    }
  }, [tier.price, tier.maxPrice, tier.isVariablePrice, capAmount]);

  return (
    <div className="flex-1 grid grid-cols-1 gap-4 w-full">
      <div>
        <label className="block text-sm font-medium text-gray-400 mb-2">
          Name
        </label>
        <input
          type="text"
          value={tier.name}
          onChange={(e) => onUpdateTier(tier.id, "name", e.target.value)}
          className="w-full p-4 bg-[#FFFFFF14] rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#836EF9]"
          placeholder="e.g., VIP Access"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-400 mb-2">
          {tier.isVariablePrice ? "Price Range (USDC)" : "Fixed Price (USDC)"}
        </label>
        <div className="flex items-center gap-2">
          {tier.isVariablePrice ? (
            <>
              <div className="flex-1">
                <NumberInput
                  value={tier.minPrice}
                  onChange={(value) => {
                    // If value is empty, set it to "0"
                    const newValue = value === "" ? "0" : value;
                    onUpdateTier(tier.id, "minPrice", newValue);
                  }}
                  placeholder="Min"
                  min={0}
                  step={0.01}
                />
              </div>
              <span className="text-gray-400">to</span>
              <div className="flex-1 flex flex-col">
                <NumberInput
                  value={tier.maxPrice}
                  onChange={(value) => onUpdateTier(tier.id, "maxPrice", value)}
                  placeholder="Max"
                  min={0}
                  step={0.01}
                />
                {maxPriceError && (
                  <span className="text-xs text-red-500 mt-1">
                    {maxPriceError}
                  </span>
                )}
              </div>
            </>
          ) : (
            <div className="w-full flex flex-col">
              <NumberInput
                value={tier.price}
                onChange={(value) => onUpdateTier(tier.id, "price", value)}
                placeholder="0"
                min={0}
                step={0.01}
              />
              {priceError && (
                <span className="text-xs text-red-500 mt-1">{priceError}</span>
              )}
            </div>
          )}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-400 mb-2">
          Max Patrons
        </label>
        <NumberInput
          value={tier.maxPatrons}
          onChange={(value) => onUpdateTier(tier.id, "maxPatrons", value)}
          placeholder="0 for unlimited"
          min={0}
          step={1}
        />
      </div>

      <div className="flex items-center gap-2">
        <label className="flex items-center cursor-pointer">
          <div className="relative">
            <input
              type="checkbox"
              className="sr-only"
              checked={tier.isVariablePrice}
              onChange={(e) =>
                onUpdateTier(tier.id, "isVariablePrice", e.target.checked)
              }
            />
            <div
              className={`w-10 h-6 rounded-full shadow-inner transition-colors ${
                tier.isVariablePrice ? "bg-[#836EF9]" : "bg-gray-600"
              }`}
            ></div>
            <div
              className={`absolute w-4 h-4 bg-white rounded-full shadow transition-transform ${
                tier.isVariablePrice ? "translate-x-4" : "translate-x-1"
              } top-1`}
            ></div>
          </div>
          <span className="ml-3 text-sm text-gray-400">
            Allow custom amounts within a range
          </span>
        </label>
      </div>
    </div>
  );
};
