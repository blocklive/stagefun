import React, { useState, useEffect } from "react";
import { Tier } from "../../types";
import { UINT256_MAX, isUncapped } from "@/lib/utils/contractValues";
import FloatingLabelInput, {
  USDCInput,
} from "@/app/components/FloatingLabelInput";
import Image from "next/image";
import { MINIMUM_PRICE } from "@/lib/constants/pricing";

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

  // Validate input when it changes to enforce minimum price
  const validateAndUpdatePrice = (field: keyof Tier, value: string) => {
    if (value === "" || /^\d*\.?\d*$/.test(value)) {
      // First, update the value as entered
      onUpdateTier(tier.id, field, value);

      // Then validate if it's a complete number below minimum
      const numValue = parseFloat(value);
      if (!isNaN(numValue) && numValue < MINIMUM_PRICE) {
        // If it's below minimum, set it to the minimum
        onUpdateTier(tier.id, field, MINIMUM_PRICE.toString());
      }
    }
  };

  // Handle price mode change
  const handlePricingModeChange = (mode: "fixed" | "range" | "uncapped") => {
    setPricingMode(mode);

    if (mode === "fixed") {
      onUpdateTier(tier.id, "isVariablePrice", false);
      // Ensure price is at least the minimum
      const currentPrice = parseFloat(tier.price);
      if (isNaN(currentPrice) || currentPrice < MINIMUM_PRICE) {
        onUpdateTier(tier.id, "price", MINIMUM_PRICE.toString());
      }
    } else if (mode === "range") {
      onUpdateTier(tier.id, "isVariablePrice", true);

      // Ensure minPrice is at least the minimum
      const currentMinPrice = parseFloat(tier.minPrice);
      if (isNaN(currentMinPrice) || currentMinPrice < MINIMUM_PRICE) {
        onUpdateTier(tier.id, "minPrice", MINIMUM_PRICE.toString());
      }

      // Check if we're coming from uncapped mode (with the huge UINT256_MAX value)
      // If so, reset to a reasonable default
      if (isUncapped(tier.maxPrice)) {
        // Set max price to at least 2x the min price or minimum price if min price is not set
        const minPrice = parseFloat(tier.minPrice) || MINIMUM_PRICE;
        const newMaxPrice = Math.max(minPrice * 2, MINIMUM_PRICE).toString();
        onUpdateTier(tier.id, "maxPrice", newMaxPrice);
      }
    } else if (mode === "uncapped") {
      onUpdateTier(tier.id, "isVariablePrice", true);

      // Ensure minPrice is at least the minimum
      const currentMinPrice = parseFloat(tier.minPrice);
      if (isNaN(currentMinPrice) || currentMinPrice < MINIMUM_PRICE) {
        onUpdateTier(tier.id, "minPrice", MINIMUM_PRICE.toString());
      }

      // Set maxPrice to uint256.max value
      onUpdateTier(tier.id, "maxPrice", UINT256_MAX);
    }
  };

  // Validate price against cap whenever price, maxPrice, or capAmount change
  useEffect(() => {
    const capValue = parseFloat(capAmount);

    // Validate minimum price requirements first
    if (!tier.isVariablePrice) {
      const price = parseFloat(tier.price);
      if (!isNaN(price) && price < MINIMUM_PRICE) {
        setPriceError(`Price must be at least ${MINIMUM_PRICE} USDC`);
      } else if (capValue > 0 && !isNaN(price) && price > capValue) {
        setPriceError(`Price cannot exceed the funding cap (${capValue} USDC)`);
      } else {
        setPriceError(null);
      }
    } else {
      // For variable price tiers
      const minPrice = parseFloat(tier.minPrice);
      if (!isNaN(minPrice) && minPrice < MINIMUM_PRICE) {
        setMinPriceError(`Min price must be at least ${MINIMUM_PRICE} USDC`);
      } else {
        setMinPriceError(null);
      }

      // Only validate max price against cap for range mode (not uncapped)
      if (pricingMode === "range") {
        const maxPrice = parseFloat(tier.maxPrice);
        if (!isNaN(maxPrice) && maxPrice < MINIMUM_PRICE) {
          setMaxPriceError(`Max price must be at least ${MINIMUM_PRICE} USDC`);
        } else if (capValue > 0 && !isNaN(maxPrice) && maxPrice > capValue) {
          setMaxPriceError(
            `Max price cannot exceed the funding cap (${capValue} USDC)`
          );
        } else {
          setMaxPriceError(null);
        }
      } else {
        setMaxPriceError(null);
      }
    }
  }, [
    tier.price,
    tier.minPrice,
    tier.maxPrice,
    tier.isVariablePrice,
    capAmount,
    pricingMode,
  ]);

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

  // Create increment/decrement buttons for number inputs
  const createIncrementalButtons = (
    value: string,
    onChange: (value: string) => void,
    minValue: number = MINIMUM_PRICE,
    step: number = 1
  ) => {
    return (
      <div className="flex flex-col gap-1">
        <button
          type="button"
          className="w-6 h-6 bg-[#FFFFFF14] hover:bg-[#FFFFFF1A] rounded-md flex items-center justify-center focus:outline-none transition-colors"
          onClick={() => {
            const currentValue = parseFloat(value);
            if (!isNaN(currentValue)) {
              onChange((currentValue + step).toString());
            } else {
              onChange(
                minValue === 0 ? MINIMUM_PRICE.toString() : minValue.toString()
              );
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
            if (!isNaN(currentValue) && currentValue > minValue) {
              onChange((currentValue - step).toString());
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
    <div className="flex-1 grid grid-cols-1 gap-4 w-full h-[450px] overflow-y-auto pr-2">
      <div>
        <FloatingLabelInput
          value={tier.name}
          onChange={(value) => onUpdateTier(tier.id, "name", value)}
          placeholder="Name"
          className="w-full"
        />
      </div>

      {/* Pricing type selector buttons */}
      <div className="mb-2">
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
        <div>
          {pricingMode === "fixed" && (
            <div className="w-full flex flex-col">
              <USDCInput
                value={tier.price}
                onChange={(value) => validateAndUpdatePrice("price", value)}
                placeholder="Fixed Price (USDC)"
                rightElements={createIncrementalButtons(
                  tier.price,
                  (value) => onUpdateTier(tier.id, "price", value),
                  MINIMUM_PRICE,
                  0.01
                )}
              />
              <div className="h-5 mt-1">
                {priceError && (
                  <span className="text-xs text-red-500">{priceError}</span>
                )}
              </div>
            </div>
          )}

          {pricingMode === "range" && (
            <div className="w-full space-y-2">
              <div className="flex items-center gap-2">
                <div className="flex-1 flex flex-col">
                  <USDCInput
                    value={tier.minPrice}
                    onChange={(value) =>
                      validateAndUpdatePrice("minPrice", value)
                    }
                    placeholder="Min Price"
                    rightElements={createIncrementalButtons(
                      tier.minPrice,
                      (value) => onUpdateTier(tier.id, "minPrice", value),
                      MINIMUM_PRICE,
                      0.01
                    )}
                  />
                  <div className="h-5 mt-1">
                    {minPriceError && (
                      <span className="text-xs text-red-500">
                        {minPriceError}
                      </span>
                    )}
                  </div>
                </div>
                <span className="text-gray-400 py-4">to</span>
                <div className="flex-1 flex flex-col">
                  <USDCInput
                    value={tier.maxPrice}
                    onChange={(value) =>
                      validateAndUpdatePrice("maxPrice", value)
                    }
                    placeholder="Max Price"
                    rightElements={createIncrementalButtons(
                      tier.maxPrice,
                      (value) => onUpdateTier(tier.id, "maxPrice", value),
                      Math.max(
                        parseFloat(tier.minPrice) || MINIMUM_PRICE,
                        MINIMUM_PRICE
                      ),
                      0.01
                    )}
                  />
                  <div className="h-5 mt-1">
                    {maxPriceError && (
                      <span className="text-xs text-red-500">
                        {maxPriceError}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {pricingMode === "uncapped" && (
            <div className="w-full flex flex-col">
              <USDCInput
                value={tier.minPrice}
                onChange={(value) => validateAndUpdatePrice("minPrice", value)}
                placeholder="Minimum Contribution (USDC)"
                rightElements={createIncrementalButtons(
                  tier.minPrice,
                  (value) => onUpdateTier(tier.id, "minPrice", value),
                  MINIMUM_PRICE,
                  0.01
                )}
              />
              <div className="h-5 mt-1">
                {minPriceError && (
                  <span className="text-xs text-red-500">{minPriceError}</span>
                )}
              </div>
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
          <div>
            <FloatingLabelInput
              value={tier.maxPatrons}
              onChange={(value) => {
                if (value === "" || /^\d*$/.test(value)) {
                  onUpdateTier(tier.id, "maxPatrons", value);
                }
              }}
              placeholder="Max Patrons"
              inputMode="numeric"
              pattern="[0-9]*"
              rightElements={createIncrementalButtons(
                tier.maxPatrons,
                (value) => onUpdateTier(tier.id, "maxPatrons", value),
                1,
                1
              )}
            />
          </div>
        )}
        {patronsMode === "uncapped" && (
          <div className="text-gray-400 text-sm flex items-center p-4">
            No limit on the number of patrons that can join this tier
          </div>
        )}
      </div>
    </div>
  );
};
