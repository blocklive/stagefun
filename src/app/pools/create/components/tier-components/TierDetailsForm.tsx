import React, { useState, useEffect, useRef } from "react";
import { Tier } from "../../types";
import { MAX_SAFE_VALUE, isUncapped } from "@/lib/utils/contractValues";
import FloatingLabelInput, {
  USDCInput,
} from "@/app/components/FloatingLabelInput";
import Image from "next/image";
import { MINIMUM_PRICE } from "@/lib/constants/pricing";
import SelectorButton from "@/app/components/SelectorButton";

interface TierDetailsFormProps {
  tier: Tier;
  onUpdateTier: (
    tierId: string,
    fieldOrFields: keyof Tier | Partial<Tier>,
    value?: any
  ) => void;
  capAmount?: string;
  fundingGoal?: string;
  disabled?: boolean;
}

export const TierDetailsForm: React.FC<TierDetailsFormProps> = ({
  tier,
  onUpdateTier,
  capAmount = "0",
  fundingGoal = "0.1",
  disabled = false,
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

  // Set initial pricingMode in tier object if not already set
  if (!tier.pricingMode) {
    tier.pricingMode = pricingMode;
    onUpdateTier(tier.id, "pricingMode", pricingMode);
  }

  // Get the true funding goal (needed because props may not reflect actual value)
  const getTrueFundingGoal = () => {
    const propValue = parseFloat(fundingGoal);

    // Try to extract from tier price if it looks reasonable
    const currentTierPrice = parseFloat(tier.price);
    if (!isNaN(currentTierPrice) && currentTierPrice > 0.1) {
      const patronCount = 20;
      const possibleFundingGoal = currentTierPrice * patronCount;

      if (possibleFundingGoal > 1) {
        return possibleFundingGoal;
      }
    }

    // Fallback to prop value or minimum reasonable value
    return !isNaN(propValue) && propValue > 0
      ? propValue
      : Math.max(5, MINIMUM_PRICE * 20);
  };

  // Simply pass through the input value with no interference
  const handleInputChange = (field: keyof Tier, value: string) => {
    // Pass through ANY value the user types with absolutely no validation or processing
    onUpdateTier(tier.id, field, value);
  };

  // Handle price mode change - ONLY place we set defaults
  const handlePricingModeChange = (mode: "fixed" | "range" | "uncapped") => {
    console.log(`[DEBUG] Changing pricing mode to ${mode}. Current values:`, {
      tierId: tier.id,
      currentMode: tier.pricingMode,
      price: tier.price,
      minPrice: tier.minPrice,
      maxPrice: tier.maxPrice,
      isVariablePrice: tier.isVariablePrice,
    });

    // Update local state to control UI
    setPricingMode(mode);

    // First update the basic mode properties - these are always set
    const modeProperties: Partial<Tier> = {
      pricingMode: mode,
      isVariablePrice: mode !== "fixed",
    };

    // Always apply mode properties first with separate update to ensure they are set
    onUpdateTier(tier.id, modeProperties);
    console.log("[DEBUG] Set core pricing properties:", modeProperties);

    // Calculate suggested minimum price once
    const suggestedMinPrice = getTrueFundingGoal() / 20;
    console.log(`[DEBUG] Suggested min price: ${suggestedMinPrice}`);

    // Handle specific mode logic
    if (mode === "uncapped") {
      // For uncapped mode, we only set values if they don't exist
      const updates: Partial<Tier> = {
        maxPrice: MAX_SAFE_VALUE,
        // Force isVariablePrice true for uncapped mode to ensure consistency
        isVariablePrice: true,
        pricingMode: "uncapped",
      };

      // SIMPLIFIED LOGIC: Only set minPrice if it doesn't exist or is invalid
      const hasValidMinPrice =
        tier.minPrice && parseFloat(tier.minPrice) >= MINIMUM_PRICE;
      console.log(
        `[DEBUG] Has valid min price: ${hasValidMinPrice}, value: ${tier.minPrice}`
      );

      if (!hasValidMinPrice) {
        updates.minPrice = suggestedMinPrice.toString();
        console.log(`[DEBUG] Setting default minPrice: ${updates.minPrice}`);
      } else {
        console.log(`[DEBUG] Keeping existing minPrice: ${tier.minPrice}`);
      }

      // Apply updates together
      onUpdateTier(tier.id, updates);

      console.log("[DEBUG] Uncapped mode set:", {
        minPrice: updates.minPrice || tier.minPrice,
        maxPrice: MAX_SAFE_VALUE,
        isVariablePrice: true,
        pricingMode: "uncapped",
      });
    } else if (mode === "range") {
      // For range mode, we need to set both min and max
      const updates: Partial<Tier> = {
        // Force isVariablePrice true for range mode to ensure consistency
        isVariablePrice: true,
        pricingMode: "range",
      };

      // SIMPLIFIED LOGIC: Only set minPrice if it doesn't exist or is invalid
      const hasValidMinPrice =
        tier.minPrice && parseFloat(tier.minPrice) >= MINIMUM_PRICE;
      console.log(
        `[DEBUG] Has valid min price: ${hasValidMinPrice}, value: ${tier.minPrice}`
      );

      if (!hasValidMinPrice) {
        updates.minPrice = suggestedMinPrice.toString();
        console.log(`[DEBUG] Setting default minPrice: ${updates.minPrice}`);
      } else {
        console.log(`[DEBUG] Keeping existing minPrice: ${tier.minPrice}`);
      }

      // Only set maxPrice if it doesn't exist, is invalid or less than minPrice
      const currentMinPrice = updates.minPrice || tier.minPrice || "0";
      const parsedMinPrice = parseFloat(currentMinPrice);
      const hasValidMaxPrice =
        tier.maxPrice &&
        parseFloat(tier.maxPrice) >= MINIMUM_PRICE &&
        parseFloat(tier.maxPrice) > parsedMinPrice;

      console.log(
        `[DEBUG] Has valid max price: ${hasValidMaxPrice}, value: ${tier.maxPrice}`
      );

      if (!hasValidMaxPrice) {
        updates.maxPrice = (parsedMinPrice * 2).toString();
        console.log(`[DEBUG] Setting default maxPrice: ${updates.maxPrice}`);
      } else {
        console.log(`[DEBUG] Keeping existing maxPrice: ${tier.maxPrice}`);
      }

      // Only send update if we have changes
      if (Object.keys(updates).length > 1) {
        // > 1 because we always have pricingMode
        onUpdateTier(tier.id, updates);
      }

      console.log("[DEBUG] Range mode set:", {
        minPrice: updates.minPrice || tier.minPrice,
        maxPrice: updates.maxPrice || tier.maxPrice,
        isVariablePrice: true,
        pricingMode: "range",
      });
    } else if (mode === "fixed") {
      // For fixed mode, we set a default price based on funding goal
      // and explicitly set isVariablePrice to false
      const updates: Partial<Tier> = {
        isVariablePrice: false,
        pricingMode: "fixed",
      };

      // SIMPLIFIED LOGIC: Only set price if it doesn't exist or is invalid
      const hasValidPrice =
        tier.price && parseFloat(tier.price) >= MINIMUM_PRICE;
      console.log(
        `[DEBUG] Has valid price: ${hasValidPrice}, value: ${tier.price}`
      );

      if (!hasValidPrice) {
        updates.price = getTrueFundingGoal().toString();
        console.log(`[DEBUG] Setting default price: ${updates.price}`);
      } else {
        console.log(`[DEBUG] Keeping existing price: ${tier.price}`);
      }

      // Apply updates
      onUpdateTier(tier.id, updates);

      console.log("[DEBUG] Fixed mode set:", {
        price: updates.price || tier.price,
        isVariablePrice: false,
        pricingMode: "fixed",
      });
    }
  };

  // Validate price against cap whenever price, maxPrice, or capAmount change
  useEffect(() => {
    const capValue = parseFloat(capAmount);
    console.log(
      "Validating with capAmount:",
      capAmount,
      "parsed as:",
      capValue,
      "is uncapped:",
      capValue === 0
    );

    // Validate minimum price requirements first
    if (!tier.isVariablePrice) {
      const price = parseFloat(tier.price);
      if (!isNaN(price) && price < MINIMUM_PRICE) {
        setPriceError(`Price must be at least ${MINIMUM_PRICE} USDC`);
      } else if (capValue > 0 && !isNaN(price) && price > capValue) {
        // Only check against cap if we have a cap (capValue > 0)
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
          // Only check against cap if we have a cap (capValue > 0)
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

  // Debug tier values
  useEffect(() => {
    console.log("Tier state updated:", {
      id: tier.id,
      minPrice: tier.minPrice,
      maxPrice: tier.maxPrice,
      pricingMode,
      isVariablePrice: tier.isVariablePrice,
    });
  }, [
    tier.minPrice,
    tier.maxPrice,
    tier.id,
    tier.isVariablePrice,
    pricingMode,
  ]);

  // Add debugging useEffect
  useEffect(() => {
    console.log("Tier updated:", {
      id: tier.id,
      minPrice: tier.minPrice,
      maxPrice: tier.maxPrice,
      pricingMode: tier.pricingMode,
      isVariablePrice: tier.isVariablePrice,
    });
  }, [tier]);

  // Set the patrons display mode (limited or uncapped)
  const [patronsMode, setPatronsMode] = useState<"limited" | "uncapped">(
    isUncapped(tier.maxPatrons) ? "uncapped" : "limited"
  );

  // Set initial patronsMode in tier object if not already set
  if (!tier.patronsMode) {
    tier.patronsMode = patronsMode;
    onUpdateTier(tier.id, "patronsMode", patronsMode);
  }

  // Handle patrons mode change
  const handlePatronsModeChange = (mode: "limited" | "uncapped") => {
    console.log(`Changing patrons mode to ${mode}`);

    // Update local state to control UI
    setPatronsMode(mode);

    // Copy the tier for modifications
    const updatedTier = { ...tier };
    updatedTier.patronsMode = mode;

    if (mode === "uncapped") {
      // For patron limits, we still use MAX_SAFE_VALUE
      // This is okay because the database handles unlimited patrons differently
      // Set maxPatrons to MAX_SAFE_VALUE
      onUpdateTier(updatedTier.id, "maxPatrons", MAX_SAFE_VALUE);
    } else {
      // Default to 20 patrons if switching to limited mode
      onUpdateTier(
        updatedTier.id,
        "maxPatrons",
        isUncapped(updatedTier.maxPatrons) ? "20" : updatedTier.maxPatrons
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
    if (disabled) {
      // Return empty buttons that won't work when disabled
      return (
        <div className="flex flex-col gap-1 opacity-60">
          <div className="w-6 h-6 bg-[#FFFFFF14] rounded-md flex items-center justify-center cursor-not-allowed">
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M18 15L12 9L6 15"
                stroke="gray"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <div className="w-6 h-6 bg-[#FFFFFF14] rounded-md flex items-center justify-center cursor-not-allowed">
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M6 9L12 15L18 9"
                stroke="gray"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        </div>
      );
    }

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

  // Add a ref to track if initial setup has been done
  const initialSetupDone = useRef(false);

  // Only handle pricing mode changes triggered by user interaction
  // Use this instead of the original handlePricingModeChange
  const handleUserPricingModeChange = (
    mode: "fixed" | "range" | "uncapped"
  ) => {
    console.log(`User changed pricing mode to ${mode}`);
    handlePricingModeChange(mode);
  };

  // Determine initial pricing mode without side effects
  useEffect(() => {
    if (initialSetupDone.current) return;

    console.log("Setting initial pricing mode without side effects");
    // Set the correct mode based on tier properties, but don't update the tier
    const initialMode = tier.isVariablePrice
      ? isUncapped(tier.maxPrice)
        ? "uncapped"
        : "range"
      : "fixed";

    // Only update component state, don't trigger tier updates
    setPricingMode(initialMode);

    // Add tier.pricingMode if it doesn't exist (without triggering updates)
    if (!tier.pricingMode) {
      tier.pricingMode = initialMode;
      console.log("Set initial pricingMode in tier object:", initialMode);
    }

    initialSetupDone.current = true;
  }, [tier.id]); // Only run when tier ID changes (new tier)

  // Add debug logging for tier values on component mount
  useEffect(() => {
    // Add a cleanup function for the timer
    const timerRef = setTimeout(() => {}, 500);
    return () => clearTimeout(timerRef);
  }, []);

  // Track price changes
  useEffect(() => {
    // Price change tracking
  }, [tier.price]);

  return (
    <div className="flex-1 grid grid-cols-1 gap-4 w-full h-[450px] overflow-y-auto pr-2">
      <div>
        <FloatingLabelInput
          value={tier.name}
          onChange={(value) => onUpdateTier(tier.id, "name", value)}
          placeholder="Name"
          className="w-full"
          disabled={disabled}
        />
      </div>

      {/* Pricing type selector buttons */}
      <div className="mb-2">
        <label className="block text-sm font-medium text-gray-400 mb-2">
          Commit Type
        </label>
        <div className="flex gap-2 mb-3">
          <SelectorButton
            onClick={() => handleUserPricingModeChange("fixed")}
            disabled={disabled}
            isActive={pricingMode === "fixed"}
          >
            Fixed Price
          </SelectorButton>
          <SelectorButton
            onClick={() => handleUserPricingModeChange("range")}
            disabled={disabled}
            isActive={pricingMode === "range"}
          >
            Price Range
          </SelectorButton>
          <SelectorButton
            onClick={() => handleUserPricingModeChange("uncapped")}
            disabled={disabled}
            isActive={pricingMode === "uncapped"}
          >
            Uncapped Price
          </SelectorButton>
        </div>

        {/* Price input fields based on selected mode */}
        <div>
          {pricingMode === "fixed" && (
            <div className="w-full flex flex-col">
              <USDCInput
                value={tier.price}
                onChange={(value) => handleInputChange("price", value)}
                placeholder="Fixed Price (USDC)"
                rightElements={createIncrementalButtons(
                  tier.price,
                  (value) => onUpdateTier(tier.id, "price", value),
                  MINIMUM_PRICE,
                  0.01
                )}
                disabled={disabled}
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
                    onChange={(value) => handleInputChange("minPrice", value)}
                    placeholder="Min Price"
                    rightElements={createIncrementalButtons(
                      tier.minPrice,
                      (value) => onUpdateTier(tier.id, "minPrice", value),
                      MINIMUM_PRICE,
                      0.01
                    )}
                    disabled={disabled}
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
                    onChange={(value) => handleInputChange("maxPrice", value)}
                    placeholder="Max Price"
                    rightElements={createIncrementalButtons(
                      tier.maxPrice,
                      (value) => onUpdateTier(tier.id, "maxPrice", value),
                      MINIMUM_PRICE,
                      0.01
                    )}
                    disabled={disabled}
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
                onChange={(value) => handleInputChange("minPrice", value)}
                placeholder="Minimum Contribution (USDC)"
                rightElements={createIncrementalButtons(
                  tier.minPrice,
                  (value) => onUpdateTier(tier.id, "minPrice", value),
                  MINIMUM_PRICE,
                  0.01
                )}
                disabled={disabled}
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
          <SelectorButton
            onClick={() => handlePatronsModeChange("limited")}
            disabled={disabled}
            isActive={patronsMode === "limited"}
          >
            Limited
          </SelectorButton>
          <SelectorButton
            onClick={() => handlePatronsModeChange("uncapped")}
            disabled={disabled}
            isActive={patronsMode === "uncapped"}
          >
            Uncapped
          </SelectorButton>
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
              disabled={disabled}
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
