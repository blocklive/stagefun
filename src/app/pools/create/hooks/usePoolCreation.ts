import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { usePrivy } from "@privy-io/react-auth";
import { useSupabase } from "@/contexts/SupabaseContext";
import { useContractInteraction } from "@/contexts/ContractInteractionContext";
import { useNativeBalance } from "@/hooks/useNativeBalance";
import { v4 as uuidv4 } from "uuid";
import showToast from "@/utils/toast";
import {
  toUSDCBaseUnits,
  safeToUSDCBaseUnits,
} from "@/lib/contracts/StageDotFunPool";
import { MAX_SAFE_VALUE, isUncapped } from "@/lib/utils/contractValues";

export const usePoolCreation = () => {
  const router = useRouter();
  const { user: privyUser } = usePrivy();
  const { dbUser } = useSupabase();
  const { createPoolWithDatabase, isLoading: isContractLoading } =
    useContractInteraction();
  const {
    balance: nativeBalance,
    isLoading: isBalanceLoading,
    refresh: refreshNativeBalance,
  } = useNativeBalance();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showValidation, setShowValidation] = useState(false);
  const [showGasWarning, setShowGasWarning] = useState(false);
  const [balanceChecked, setBalanceChecked] = useState(true);
  const [uniqueId] = useState<string>(uuidv4());
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (
    poolName: string,
    ticker: string,
    description: string,
    fundingGoal: number,
    capAmount: number,
    imagePreview: string,
    tiers: any[],
    location: string,
    socialLinks: any,
    endTimeUnix: number,
    availableRewards: Array<{
      id: string;
      name: string;
      description: string;
      type: string;
    }>,
    investmentTerms?: any
  ) => {
    // Validate required fields
    if (!poolName || !poolName.trim()) {
      showToast.error("Please enter a pool name");
      return;
    }

    if (!ticker || !ticker.trim()) {
      showToast.error("Please enter a ticker symbol");
      return;
    }

    if (!description || !description.trim()) {
      showToast.error("Please enter a description");
      return;
    }

    if (!fundingGoal || fundingGoal <= 0) {
      showToast.error("Please enter a valid funding goal");
      return;
    }

    // Only check cap amount if it's provided - otherwise use target amount as cap
    if (capAmount && capAmount <= 0) {
      showToast.error("Please enter a valid cap amount");
      return;
    }

    // If cap amount is provided, make sure it's at least the funding goal
    if (capAmount && capAmount < fundingGoal) {
      showToast.error(
        "Cap amount must be greater than or equal to funding goal"
      );
      return;
    }

    if (!imagePreview) {
      showToast.error("Please upload a pool image");
      return;
    }

    if (!tiers || tiers.length === 0) {
      showToast.error("Please add at least one tier");
      return;
    }

    // Validate each tier
    for (const tier of tiers) {
      // Basic required field validation
      if (!tier.name) {
        throw new Error(`Tier name is required`);
      }

      if (!tier.maxPatrons) {
        throw new Error(`Maximum number of patrons is required`);
      }

      // Validate that imageUrl is a proper URL and not base64
      if (tier.imageUrl && tier.imageUrl.startsWith("data:")) {
        throw new Error(
          `Cannot store base64 image in database for tier "${tier.name}". Upload to storage first.`
        );
      }

      // Different validation paths based on tier pricing type
      if (tier.isVariablePrice) {
        // For uncapped tiers, only validate minPrice
        if (tier.pricingMode === "uncapped") {
          if (!tier.minPrice || parseFloat(tier.minPrice) <= 0) {
            showToast.error(
              `Please enter a valid minimum price for tier "${tier.name}"`
            );
            return;
          }
        } else {
          // For range pricing, validate both min and max price
          if (!tier.minPrice || parseFloat(tier.minPrice) <= 0) {
            showToast.error(
              `Please enter a valid minimum price for tier "${tier.name}"`
            );
            return;
          }
          if (!tier.maxPrice || parseFloat(tier.maxPrice) <= 0) {
            showToast.error(
              `Please enter a valid maximum price for tier "${tier.name}"`
            );
            return;
          }
          if (
            parseFloat(tier.minPrice) >= parseFloat(tier.maxPrice) &&
            parseFloat(tier.minPrice) !== 0
          ) {
            showToast.error(
              `Maximum price must be greater than minimum price for tier "${tier.name}"`
            );
            return;
          }
        }
      } else {
        // For fixed price tiers
        if (!tier.price || parseFloat(tier.price) <= 0) {
          showToast.error(`Please enter a valid price for tier "${tier.name}"`);
          return;
        }
      }

      if (!tier.nftMetadata && !tier.imageUrl) {
        showToast.error(`Please upload an image for tier "${tier.name}"`);
        return;
      }

      // Description is optional, so we don't validate it
    }

    setIsSubmitting(true);
    setError(null);

    try {
      // Format the pool data
      const formattedPoolData = {
        id: uniqueId,
        name: poolName,
        ticker,
        description,
        target_amount: Number(toUSDCBaseUnits(fundingGoal)), // Store in base units in DB
        cap_amount:
          capAmount.toString() === MAX_SAFE_VALUE
            ? Number(MAX_SAFE_VALUE)
            : Number(toUSDCBaseUnits(capAmount)), // Ensure cap_amount is a number
        currency: "USDC",
        token_amount: 0,
        token_symbol: ticker,
        location,
        venue: "",
        status: "ACTIVE",
        funding_stage: "ACTIVE",
        ends_at: endTimeUnix.toString(),
        creator_id: dbUser?.id || "",
        raised_amount: 0,
        image_url: imagePreview,
        social_links: socialLinks,
        investment_terms: investmentTerms,
        tiers: tiers.map((tier) => {
          // Basic validation for required fields
          const price = parseFloat(tier.price);
          const minPrice = parseFloat(tier.minPrice);
          const maxPrice = parseFloat(tier.maxPrice);
          const maxPatrons = parseInt(tier.maxPatrons);

          if (!tier.name) {
            throw new Error(`Tier name is required`);
          }

          if (isNaN(maxPatrons) || maxPatrons <= 0) {
            throw new Error(
              `Please enter a valid maximum number of patrons for tier "${tier.name}"`
            );
          }

          if (
            tier.imageUrl &&
            tier.imageUrl.startsWith("data:image") &&
            tier.imageUrl.includes("base64")
          ) {
            throw new Error(
              `Cannot store base64 image in database for tier "${tier.name}". Upload to storage first.`
            );
          }

          // Different validation paths based on tier pricing type
          if (tier.isVariablePrice) {
            // For uncapped tiers, only validate minPrice
            if (tier.pricingMode === "uncapped") {
              if (isNaN(minPrice) || minPrice <= 0) {
                throw new Error(
                  `Please enter a valid minimum price for tier "${tier.name}"`
                );
              }
            } else {
              // For range pricing, validate both min and max
              if (isNaN(minPrice) || minPrice <= 0) {
                throw new Error(
                  `Please enter a valid minimum price for tier "${tier.name}"`
                );
              }

              if (isNaN(maxPrice) || maxPrice <= 0) {
                throw new Error(
                  `Please enter a valid maximum price for tier "${tier.name}"`
                );
              }

              if (minPrice >= maxPrice && minPrice !== 0) {
                throw new Error(
                  `Maximum price must be greater than minimum price for tier "${tier.name}"`
                );
              }
            }
          } else if (isNaN(price) || price <= 0) {
            // For fixed price tiers
            showToast.error(
              `Please enter a valid price for tier "${tier.name}"`
            );
            throw new Error(
              `Please enter a valid price for tier "${tier.name}"`
            );
          }

          if (!tier.imageUrl) {
            showToast.error(`Please upload an image for tier "${tier.name}"`);
            throw new Error(`Please upload an image for tier "${tier.name}"`);
          }

          // Get full reward item data for each ID in the tier
          const rewardItemsData = tier.rewardItems
            .map((id: string) =>
              availableRewards.find(
                (reward: { id: string }) => reward.id === id
              )
            )
            .filter(
              (
                item:
                  | {
                      id: string;
                      name: string;
                      description: string;
                      type: string;
                    }
                  | undefined
              ) => item !== undefined
            ) as typeof availableRewards;

          return {
            name: tier.name,
            price: tier.isVariablePrice
              ? Number(toUSDCBaseUnits(parseFloat(tier.minPrice))) // Store in base units in DB
              : Number(toUSDCBaseUnits(parseFloat(tier.price))), // Store in base units in DB
            isActive: tier.isActive !== false, // Default to true if not explicitly false
            nftMetadata: tier.nftMetadata || "",
            isVariablePrice: tier.isVariablePrice || false,
            minPrice: Number(toUSDCBaseUnits(parseFloat(tier.minPrice))), // Store in base units in DB
            maxPrice: isUncapped(tier.maxPrice)
              ? MAX_SAFE_VALUE // Use consistent MAX_SAFE_VALUE for uncapped
              : Number(toUSDCBaseUnits(parseFloat(tier.maxPrice))), // Store normal values in base units
            maxPatrons: isUncapped(tier.maxPatrons)
              ? MAX_SAFE_VALUE // Use consistent MAX_SAFE_VALUE for uncapped
              : Number(tier.maxPatrons), // Store normal values in base units
            description: tier.description || `${tier.name} tier`,
            rewardItems: tier.rewardItems,
            rewardItemsData, // Include full reward item data
            imageUrl: tier.imageUrl,
            pricingMode: tier.pricingMode || "fixed",
            patronsMode: tier.patronsMode || "limited",
          };
        }),
      };

      // Create pool on blockchain and database
      const result = await createPoolWithDatabase(
        formattedPoolData,
        endTimeUnix
      );

      if (result.success) {
        // Navigate to the slug-based route if available, otherwise fallback to ID
        if (result.data?.slug) {
          router.replace(`/${result.data.slug}`);
        } else {
          router.replace(`/pools/${result.data.id}`);
        }
      } else {
        setError(result.error || "Failed to create pool");
        showToast.error(result.error || "Failed to create pool");
      }
    } catch (error: any) {
      console.error("Error creating pool:", error);
      setError(error.message || "Failed to create pool");
      showToast.error(error.message || "Failed to create pool");
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    isSubmitting,
    showValidation,
    showGasWarning,
    balanceChecked,
    uniqueId,
    error,
    handleSubmit,
    refreshNativeBalance,
  };
};

export default usePoolCreation;
