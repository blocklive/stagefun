import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { usePrivy } from "@privy-io/react-auth";
import { useSupabase } from "@/contexts/SupabaseContext";
import { useContractInteraction } from "@/contexts/ContractInteractionContext";
import { useNativeBalance } from "@/hooks/useNativeBalance";
import { v4 as uuidv4 } from "uuid";
import showToast from "@/utils/toast";

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
    endTimeUnix: number
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
      if (!tier.name || !tier.price || !tier.maxPatrons) {
        throw new Error(
          "All required tier fields (name, price, max patrons) must be filled"
        );
      }

      // Validate tier price is greater than 0
      const tierPrice = parseFloat(tier.price);
      if (tierPrice <= 0) {
        throw new Error(`Tier price must be greater than 0`);
      }

      if (tier.isVariablePrice) {
        if (
          tier.minPrice === undefined ||
          tier.minPrice === null ||
          (!tier.minPrice && tier.minPrice !== 0)
        ) {
          showToast.error(
            `Please enter a valid minimum price for tier "${tier.name}"`
          );
          return;
        }
        if (!tier.maxPrice || tier.maxPrice <= 0) {
          showToast.error(
            `Please enter a valid maximum price for tier "${tier.name}"`
          );
          return;
        }
        if (tier.maxPrice <= tier.minPrice && tier.minPrice !== 0) {
          showToast.error(
            `Maximum price must be greater than minimum price for tier "${tier.name}"`
          );
          return;
        }
      } else {
        if (!tier.price || tier.price <= 0) {
          showToast.error(`Please enter a valid price for tier "${tier.name}"`);
          return;
        }
      }

      if (!tier.maxPatrons || tier.maxPatrons < 0) {
        showToast.error(
          `Please enter a valid maximum number of patrons for tier "${tier.name}"`
        );
        return;
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
        target_amount: fundingGoal,
        cap_amount: capAmount,
        currency: "USDC",
        token_amount: 0,
        token_symbol: "USDC",
        location,
        venue: "",
        status: "ACTIVE",
        funding_stage: "ACTIVE",
        ends_at: endTimeUnix.toString(),
        creator_id: dbUser?.id || "",
        raised_amount: 0,
        image_url: imagePreview,
        social_links: socialLinks,
        tiers: tiers.map((tier) => ({
          name: tier.name,
          price: tier.isVariablePrice
            ? parseFloat(tier.minPrice)
            : parseFloat(tier.price),
          isActive: tier.isActive,
          nftMetadata: tier.nftMetadata,
          isVariablePrice: tier.isVariablePrice,
          minPrice: parseFloat(tier.minPrice),
          maxPrice: parseFloat(tier.maxPrice),
          maxPatrons: parseInt(tier.maxPatrons),
          description: tier.description || `${tier.name} tier`,
          rewardItems: tier.rewardItems,
        })),
      };

      // Create pool on blockchain and database
      const result = await createPoolWithDatabase(
        formattedPoolData,
        endTimeUnix
      );

      if (result.success) {
        // Replace current history entry with the new pool details
        router.replace(`/pools/${result.data.id}`);
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
