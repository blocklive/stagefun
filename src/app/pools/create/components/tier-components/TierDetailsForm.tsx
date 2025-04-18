import React, { useState, useEffect } from "react";
import NumberInput from "@/app/components/NumberInput";
import EnhancedNumberInput from "@/app/components/EnhancedNumberInput";
import { Tier } from "../../types";
import { UINT256_MAX, isUncapped } from "@/lib/utils/contractValues";

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
  const [minPriceError, setMinPriceError] = useState<string | null>(null);

  // Pricing mode: "fixed", "range", or "uncapped"
  const [pricingMode, setPricingMode] = useState<
    "fixed" | "range" | "uncapped"
  >(
    tier.isVariablePrice
      ? isUncapped(tier.maxPrice)
        ? "uncapped"
        : "range"
      : "fixed"
  );

  // Handle price mode change
  const handlePricingModeChange = (mode: "fixed" | "range" | "uncapped") => {
    setPricingMode(mode);

    if (mode === "fixed") {
      onUpdateTier(tier.id, "isVariablePrice", false);
    } else if (mode === "range") {
      onUpdateTier(tier.id, "isVariablePrice", true);
      if (!tier.minPrice) onUpdateTier(tier.id, "minPrice", "0");

      // If switching from uncapped mode, reset the max price to a reasonable value
      if (isUncapped(tier.maxPrice)) {
        // Set max price to either 2x min price or 100, whichever is higher
        const minPriceNum = parseFloat(tier.minPrice) || 0;
        const newMaxPrice = Math.max(minPriceNum * 2, 100).toString();
        onUpdateTier(tier.id, "maxPrice", newMaxPrice);
      } else if (!tier.maxPrice) {
        onUpdateTier(tier.id, "maxPrice", "0");
      }
    } else if (mode === "uncapped") {
      onUpdateTier(tier.id, "isVariablePrice", true);
      if (!tier.minPrice) onUpdateTier(tier.id, "minPrice", "1");
      // Set maxPrice to uint256.max value
      onUpdateTier(tier.id, "maxPrice", UINT256_MAX);
    }
  };

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
      else if (pricingMode === "range") {
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
  }, [tier.price, tier.maxPrice, tier.isVariablePrice, capAmount, pricingMode]);

  // Set the patrons display mode (limited or uncapped)
  const [patronsMode, setPatronsMode] = useState<"limited" | "uncapped">(
    isUncapped(tier.maxPatrons) ? "uncapped" : "limited"
  );

  // Handle patrons mode change
  const handlePatronsModeChange = (mode: "limited" | "uncapped") => {
    setPatronsMode(mode);

    if (mode === "uncapped") {
      // Set maxPatrons to uint256.max value
      onUpdateTier(tier.id, "maxPatrons", UINT256_MAX);
    } else {
      // Default to 20 patrons if switching to limited mode
      onUpdateTier(
        tier.id,
        "maxPatrons",
        isUncapped(tier.maxPatrons) ? "20" : tier.maxPatrons
      );
    }
  };

  return (
    <div className="flex-1 grid grid-cols-1 gap-4 w-full min-h-[400px]">
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

      {/* Pricing type selector buttons */}
      <div>
        <label className="block text-sm font-medium text-gray-400 mb-2">
          Pricing Type
        </label>
        <div className="flex gap-2 mb-3">
          <button
            type="button"
            className={`flex-1 px-4 py-2 rounded-lg ${
              pricingMode === "fixed"
                ? "bg-[#836EF9] text-white"
                : "bg-[#FFFFFF14] text-gray-300 hover:bg-[#FFFFFF24]"
            } transition-colors`}
            onClick={() => handlePricingModeChange("fixed")}
          >
            Fixed Price
          </button>
          <button
            type="button"
            className={`flex-1 px-4 py-2 rounded-lg ${
              pricingMode === "range"
                ? "bg-[#836EF9] text-white"
                : "bg-[#FFFFFF14] text-gray-300 hover:bg-[#FFFFFF24]"
            } transition-colors`}
            onClick={() => handlePricingModeChange("range")}
          >
            Price Range
          </button>
          <button
            type="button"
            className={`flex-1 px-4 py-2 rounded-lg ${
              pricingMode === "uncapped"
                ? "bg-[#836EF9] text-white"
                : "bg-[#FFFFFF14] text-gray-300 hover:bg-[#FFFFFF24]"
            } transition-colors`}
            onClick={() => handlePricingModeChange("uncapped")}
          >
            Uncapped Price
          </button>
        </div>

        {/* Price input fields based on selected mode */}
        <div className="mt-2">
          {pricingMode === "fixed" && (
            <div className="w-full flex flex-col">
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Fixed Price (USDC)
              </label>
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
              <div className="h-[52px]"></div>
            </div>
          )}

          {pricingMode === "range" && (
            <div className="w-full">
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Price Range (USDC)
              </label>
              <div className="flex items-center gap-2">
                <div className="flex-1 flex flex-col">
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
                  {minPriceError && (
                    <span className="text-xs text-red-500 mt-1">
                      {minPriceError}
                    </span>
                  )}
                </div>
                <span className="text-gray-400">to</span>
                <div className="flex-1 flex flex-col">
                  <EnhancedNumberInput
                    value={tier.maxPrice}
                    onChange={(value) =>
                      onUpdateTier(tier.id, "maxPrice", value)
                    }
                    placeholder="Max"
                    min={0}
                    step={0.01}
                    hideMaxUint={true}
                    maxUintDisplayValue="Unlimited"
                  />
                  {maxPriceError && (
                    <span className="text-xs text-red-500 mt-1">
                      {maxPriceError}
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}

          {pricingMode === "uncapped" && (
            <div className="w-full flex flex-col">
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Minimum Contribution (USDC)
              </label>
              <NumberInput
                value={tier.minPrice}
                onChange={(value) => {
                  // If value is empty, set it to "0"
                  const newValue = value === "" ? "1" : value;
                  onUpdateTier(tier.id, "minPrice", newValue);
                }}
                placeholder="Min"
                min={1}
                step={0.01}
              />
              {minPriceError && (
                <span className="text-xs text-red-500 mt-1">
                  {minPriceError}
                </span>
              )}
              <div className="h-[52px]"></div>
            </div>
          )}
        </div>
      </div>

      {/* Max Patrons section */}
      <div>
        <label className="block text-sm font-medium text-gray-400 mb-2">
          Max Patrons
        </label>

        <div className="flex gap-2 mb-3">
          <button
            type="button"
            className={`flex-1 px-4 py-2 rounded-lg ${
              patronsMode === "limited"
                ? "bg-[#836EF9] text-white"
                : "bg-[#FFFFFF14] text-gray-300 hover:bg-[#FFFFFF24]"
            } transition-colors`}
            onClick={() => handlePatronsModeChange("limited")}
          >
            Limited
          </button>
          <button
            type="button"
            className={`flex-1 px-4 py-2 rounded-lg ${
              patronsMode === "uncapped"
                ? "bg-[#836EF9] text-white"
                : "bg-[#FFFFFF14] text-gray-300 hover:bg-[#FFFFFF24]"
            } transition-colors`}
            onClick={() => handlePatronsModeChange("uncapped")}
          >
            Uncapped
          </button>
        </div>

        {patronsMode === "limited" && (
          <EnhancedNumberInput
            value={tier.maxPatrons}
            onChange={(value) => onUpdateTier(tier.id, "maxPatrons", value)}
            placeholder="20"
            min={1}
            step={1}
            hideMaxUint={true}
            maxUintDisplayValue="Unlimited"
          />
        )}
        {patronsMode === "uncapped" && (
          <div className="text-gray-400 text-sm italic h-[52px] flex items-center">
            No limit on the number of patrons that can join this tier
          </div>
        )}
      </div>
    </div>
  );
};
