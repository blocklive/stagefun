import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { usePrivy } from "@privy-io/react-auth";
import { useSupabase } from "@/contexts/SupabaseContext";
import { useContractInteraction } from "@/contexts/ContractInteractionContext";
import { useNativeBalance } from "@/hooks/useNativeBalance";
import { v4 as uuidv4 } from "uuid";
import toast from "react-hot-toast";

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
  const [balanceChecked, setBalanceChecked] = useState(false);
  const [uniqueId] = useState<string>(uuidv4());
  const [error, setError] = useState<string | null>(null);

  // Minimum recommended balance in MON (0.5 MON should be enough for deployment)
  const MIN_GAS_BALANCE = 0.5;

  // Effect to check gas balance
  useEffect(() => {
    if (!isBalanceLoading) {
      // Balance check is complete
      setBalanceChecked(true);
      if (nativeBalance) {
        const balanceNum = parseFloat(nativeBalance);
        setShowGasWarning(balanceNum < MIN_GAS_BALANCE);
      }
    }
  }, [nativeBalance, isBalanceLoading]);

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
      toast.error("Please enter a pool name");
      return;
    }

    if (!ticker || !ticker.trim()) {
      toast.error("Please enter a ticker symbol");
      return;
    }

    if (!description || !description.trim()) {
      toast.error("Please enter a description");
      return;
    }

    if (!fundingGoal || fundingGoal <= 0) {
      toast.error("Please enter a valid funding goal");
      return;
    }

    if (!capAmount || capAmount <= 0) {
      toast.error("Please enter a valid cap amount");
      return;
    }

    if (capAmount < fundingGoal) {
      toast.error("Cap amount must be greater than or equal to funding goal");
      return;
    }

    if (!imagePreview) {
      toast.error("Please upload a pool image");
      return;
    }

    if (!tiers || tiers.length === 0) {
      toast.error("Please add at least one tier");
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
        if (!tier.minPrice || tier.minPrice <= 0) {
          toast.error(
            `Please enter a valid minimum price for tier "${tier.name}"`
          );
          return;
        }
        if (!tier.maxPrice || tier.maxPrice <= 0) {
          toast.error(
            `Please enter a valid maximum price for tier "${tier.name}"`
          );
          return;
        }
        if (tier.maxPrice <= tier.minPrice) {
          toast.error(
            `Maximum price must be greater than minimum price for tier "${tier.name}"`
          );
          return;
        }
      } else {
        if (!tier.price || tier.price <= 0) {
          toast.error(`Please enter a valid price for tier "${tier.name}"`);
          return;
        }
      }

      if (!tier.maxPatrons || tier.maxPatrons < 0) {
        toast.error(
          `Please enter a valid maximum number of patrons for tier "${tier.name}"`
        );
        return;
      }

      if (!tier.nftMetadata && !tier.imageUrl) {
        toast.error(`Please upload an image for tier "${tier.name}"`);
        return;
      }

      // Description is optional, so we don't validate it
    }

    // Check if user has enough gas for deployment
    if (parseFloat(nativeBalance) < MIN_GAS_BALANCE) {
      toast.error(
        `Your wallet has ${parseFloat(nativeBalance).toFixed(
          4
        )} MON. Deploying a pool requires at least 0.5 MON to pay for gas.`,
        {
          duration: 6000,
          style: {
            background: "#1E1F25",
            color: "white",
            border: "1px solid rgba(131, 110, 249, 0.3)",
            maxWidth: "400px",
          },
        }
      );
      return;
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
        toast.success("Pool created successfully!");
        router.push(`/pools/${result.data.id}`);
      } else {
        setError(result.error || "Failed to create pool");
        toast.error(result.error || "Failed to create pool");
      }
    } catch (error: any) {
      console.error("Error creating pool:", error);
      setError(error.message || "Failed to create pool");
      toast.error(error.message || "Failed to create pool");
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
