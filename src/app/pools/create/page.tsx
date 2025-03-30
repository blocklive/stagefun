"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { usePrivy, useFundWallet } from "@privy-io/react-auth";
import {
  FaArrowLeft,
  FaMapMarkerAlt,
  FaExclamationTriangle,
} from "react-icons/fa";
import Image from "next/image";
import { useSupabase } from "../../../contexts/SupabaseContext";
import { useAuthenticatedSupabase } from "@/hooks/useAuthenticatedSupabase";
import SocialLinksInput from "@/app/components/SocialLinksInput";
import AppHeader from "../../components/AppHeader";
import GetTokensModal from "../../components/GetTokensModal";
import { useNativeBalance } from "../../../hooks/useNativeBalance";
import RichTextEditor from "@/app/components/RichTextEditor";
import InfoModal from "../../components/InfoModal";
import showToast from "@/utils/toast";

// Import our new components
import PoolImageSection from "./components/PoolImageSection";
import PoolDetailsSection from "./components/PoolDetailsSection";
import FundingSection from "./components/FundingSection";
import EndTimeSection from "./components/EndTimeSection";
import { TiersSection } from "./components/TiersSection";
import { Tier, RewardItem } from "./types";

// Import our new hooks
import usePoolImage from "./hooks/usePoolImage";
import usePoolDetails from "./hooks/usePoolDetails";
import useFunding from "./hooks/useFunding";
import useEndTime from "./hooks/useEndTime";
import usePoolCreation from "./hooks/usePoolCreation";
import { supabase } from "@/lib/supabase";

// Helper function to format a date for datetime-local input
function formatDateForInput(date: Date): string {
  // Get the local ISO string (which includes the timezone offset)
  const localISOString = new Date(
    date.getTime() - date.getTimezoneOffset() * 60000
  )
    .toISOString()
    .substring(0, 16);

  return localISOString;
}

export default function CreatePoolPage() {
  const { user: privyUser } = usePrivy();
  const { dbUser } = useSupabase();
  const { supabase, isLoading: isClientLoading } = useAuthenticatedSupabase();
  const { fundWallet } = useFundWallet();
  const router = useRouter();
  const [viewportHeight, setViewportHeight] = useState("100vh");
  const [socialLinks, setSocialLinks] = useState({});
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [showTokensModal, setShowTokensModal] = useState(false);
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [tiers, setTiers] = useState<Tier[]>([]);
  const [rewardItems, setRewardItems] = useState<RewardItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Use our custom hooks
  const {
    selectedImage,
    imagePreview,
    isUploadingImage,
    setIsUploadingImage,
    handleImageSelect,
    handleRemoveImage,
    uploadImage,
  } = usePoolImage(supabase);

  const { poolName, ticker, setPoolName, setTicker } = usePoolDetails();

  const { fundingGoal, capAmount, setFundingGoal, setCapAmount } = useFunding();

  const { endDate, endDateInputValue, handleEndDateChange } = useEndTime();

  const {
    isSubmitting,
    showValidation,
    showGasWarning,
    balanceChecked,
    uniqueId,
    handleSubmit,
    refreshNativeBalance,
  } = usePoolCreation();

  const { balance } = useNativeBalance();

  // Set the correct viewport height, accounting for mobile browsers
  useEffect(() => {
    const updateHeight = () => {
      setViewportHeight(`${window.innerHeight}px`);
    };

    updateHeight();
    window.addEventListener("resize", updateHeight);
    return () => window.removeEventListener("resize", updateHeight);
  }, []);

  // Handle browser back button
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (
        poolName ||
        ticker ||
        fundingGoal ||
        capAmount ||
        description ||
        location ||
        imagePreview ||
        Object.keys(socialLinks).length > 0
      ) {
        e.preventDefault();
        e.returnValue = "";
        return "";
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [
    poolName,
    ticker,
    fundingGoal,
    capAmount,
    description,
    location,
    imagePreview,
    socialLinks,
  ]);

  // Check if there are unsaved changes
  const hasUnsavedChanges = () => {
    return !!(
      poolName ||
      ticker ||
      fundingGoal ||
      capAmount ||
      description ||
      location ||
      imagePreview ||
      Object.keys(socialLinks).length > 0
    );
  };

  // Handle navigation attempts
  const handleNavigationAttempt = (path: string) => {
    if (hasUnsavedChanges()) {
      router.push(path);
      return false;
    }
    return true;
  };

  // Handle back button click
  const handleBackClick = () => {
    router.back();
  };

  // Handle faucet usage
  const handleFaucetUsage = async () => {
    setShowTokensModal(false);
    setTimeout(() => {
      refreshNativeBalance();
    }, 5000);
  };

  // Handle form submission
  const onSubmit = async (
    e: React.FormEvent<HTMLFormElement> | React.MouseEvent<HTMLButtonElement>
  ) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    if (!supabase || isClientLoading) {
      showToast.error("Please wait for authentication to complete");
      setIsLoading(false);
      return;
    }

    try {
      // Validate funding goal and cap amount
      const goal = parseFloat(fundingGoal);
      const cap = parseFloat(capAmount);
      if (cap < goal) {
        throw new Error(
          "Cap amount must be greater than or equal to funding goal"
        );
      }

      // Validate tiers
      if (tiers.length === 0) {
        throw new Error("At least one tier is required");
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
      }

      // No longer need to check gas balance as we're using ZeroDev for gas sponsorship
      // if (parseFloat(balance) < 0.5) {
      //   showToast.error(
      //     `Your wallet has ${parseFloat(balance).toFixed(
      //       4
      //     )} MON. Deploying a pool requires at least 0.5 MON to pay for gas.`,
      //     {
      //       duration: 6000,
      //       style: {
      //         background: "#1E1F25",
      //         color: "white",
      //         border: "1px solid rgba(131, 110, 249, 0.3)",
      //         maxWidth: "400px",
      //       },
      //     }
      //   );
      //   return;
      // }

      // Call handleSubmit from usePoolCreation with all required parameters
      await handleSubmit(
        poolName,
        ticker,
        description,
        parseFloat(fundingGoal),
        parseFloat(capAmount),
        imagePreview || "",
        tiers,
        location,
        socialLinks,
        Math.floor(endDate.getTime() / 1000)
      );
    } catch (error: any) {
      console.error("Error creating pool:", error);
      setError(error.message || "Failed to create pool");
      showToast.error(error.message || "Failed to create pool");
    } finally {
      setIsLoading(false);
    }
  };

  // Add reward item handler
  const handleAddRewardItem = (item: Omit<RewardItem, "id">) => {
    const newId = crypto.randomUUID();
    const newItem = {
      ...item,
      id: newId,
    };

    console.log(`Parent: Creating new reward "${item.name}" with ID ${newId}`);

    // Update the rewardItems state with the new item
    setRewardItems((prev) => [...prev, newItem]);

    // Return the complete new item including its ID
    return newItem;
  };

  return (
    <>
      <AppHeader
        showBackButton={true}
        showTitle={false}
        backgroundColor="#15161a"
        showGetTokensButton={true}
        onGetTokensClick={() => setShowTokensModal(true)}
        onInfoClick={() => setShowInfoModal(true)}
        onBackClick={handleBackClick}
      />

      {/* Main Content */}
      <div className="px-4 pb-24 md:pb-8">
        {/* Page Title */}
        <div className="px-2 mt-4">
          <h1 className="text-5xl font-bold">CREATE PARTY ROUND</h1>
        </div>

        {/* Gas Warning Banner - Only show when balance check is complete and balance is low */}
        {/* Gas warning removed as we're using ZeroDev for gas sponsorship */}
        {/* {balanceChecked && showGasWarning && (
          <div className="mx-6 mt-4 p-4 bg-[#1E1F25] border border-[#836EF9] border-opacity-50 rounded-lg">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-[#836EF9] bg-opacity-20 rounded-full flex items-center justify-center flex-shrink-0 mr-3">
                <FaExclamationTriangle className="text-[#836EF9]" size={18} />
              </div>
              <div>
                <h3 className="font-bold text-white">Low MON Balance</h3>
                <p className="text-sm text-gray-300">
                  Your wallet has {parseFloat(balance).toFixed(4)} MON.
                  Deploying a pool requires at least 0.5 MON to pay for gas. Use
                  one of the options below to refill your wallet.
                </p>
              </div>
            </div>
            <div className="mt-3 space-y-2">
              <button
                onClick={() => setShowTokensModal(true)}
                className="w-full py-2 px-3 bg-[#836EF9] hover:bg-[#7058E8] rounded-full text-center text-sm transition-colors"
              >
                Stage Fun Drip
              </button>
              <button
                onClick={() => {
                  if (privyUser?.wallet?.address) {
                    fundWallet(privyUser.wallet.address, {
                      chain: {
                        id: 10143,
                      },
                      asset: "native-currency",
                      uiConfig: {
                        receiveFundsTitle: "Refill Gas on Monad",
                        receiveFundsSubtitle:
                          "Scan this QR code or copy your wallet address to receive MON on Monad Testnet.",
                      },
                    });
                  }
                }}
                className="w-full py-2 px-3 bg-[#FFFFFF14] hover:bg-[#FFFFFF1A] rounded-full text-center text-sm transition-colors"
              >
                Refill Gas
              </button>
            </div>
          </div>
        )} */}

        {/* Main content */}
        <div className="px-6" style={{ paddingBottom: "40px" }}>
          {/* Pool Details, Funding, and Image Section */}
          <div className="grid grid-cols-1 md:grid-cols-[1fr,auto] gap-x-8 gap-y-6 md:gap-y-0 mt-8">
            {/* Left Column: Pool Details and Funding */}
            <div className="space-y-6 order-2 md:order-1">
              <PoolDetailsSection
                poolName={poolName}
                ticker={ticker}
                onPoolNameChange={setPoolName}
                onTickerChange={setTicker}
              />

              <FundingSection
                fundingGoal={fundingGoal}
                capAmount={capAmount}
                onFundingGoalChange={setFundingGoal}
                onCapAmountChange={setCapAmount}
              />
            </div>

            {/* Right Column: Pool Image */}
            <div className="w-full md:w-[400px] order-1 md:order-2">
              <PoolImageSection
                imagePreview={imagePreview}
                isUploadingImage={isUploadingImage}
                showValidation={showValidation}
                onImageSelect={handleImageSelect}
                onRemoveImage={handleRemoveImage}
              />
            </div>
          </div>

          {/* Form */}
          <form id="createPoolForm" onSubmit={onSubmit} className="mt-8">
            {/* Tiers Section */}
            {supabase && (
              <TiersSection
                tiers={tiers}
                onTiersChange={setTiers}
                availableRewardItems={rewardItems}
                onAddRewardItem={handleAddRewardItem}
                supabase={supabase}
                poolName={poolName}
                fundingGoal={fundingGoal}
                poolImage={imagePreview || undefined}
              />
            )}
            {!supabase && (
              <div className="mb-8 p-4 bg-red-900/30 border border-red-600 rounded-lg">
                <h3 className="text-xl font-bold text-white mb-2">
                  Tier Section Not Available
                </h3>
                <p className="text-white">
                  Supabase client not available. This is required for creating
                  tiers.
                </p>
                <button
                  type="button"
                  className="mt-2 px-4 py-2 bg-red-600 text-white rounded-md"
                  onClick={() => window.location.reload()}
                >
                  Reload Page
                </button>
              </div>
            )}

            {/* Description */}
            <div className="mb-6">
              <h2 className="text-2xl font-bold mb-4">Pool Description</h2>
              <RichTextEditor
                content={description}
                onChange={(value) => setDescription(value)}
                placeholder="Write your story..."
              />
            </div>

            {/* Location */}
            <div className="mb-6">
              <div className="relative">
                <div className="absolute left-4 top-1/2 transform -translate-y-1/2">
                  <div className="w-8 h-8 bg-[#FFFFFF14] rounded-full flex items-center justify-center">
                    <FaMapMarkerAlt className="text-white" />
                  </div>
                </div>
                <input
                  type="text"
                  placeholder="Location (Optional)"
                  name="location"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full p-4 pl-16 bg-[#FFFFFF14] rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#836EF9]"
                />
              </div>
            </div>

            {/* Social Links */}
            <div className="mb-6">
              <SocialLinksInput value={socialLinks} onChange={setSocialLinks} />
            </div>

            {/* End Time */}
            <EndTimeSection
              endDateInputValue={endDateInputValue}
              onEndDateChange={handleEndDateChange}
            />
          </form>
        </div>

        {/* Launch Button */}
        <div className="fixed bottom-0 left-0 right-0 md:static md:mt-4 px-6 py-6 bg-[#15161a] md:px-0 md:py-0 z-10">
          <button
            onClick={onSubmit}
            className="w-full py-4 bg-[#836EF9] hover:bg-[#7058E8] rounded-full text-white font-medium text-lg transition-colors"
            disabled={isLoading}
          >
            {isLoading ? "Creating..." : "Launch Party Round"}
          </button>
        </div>
      </div>

      {/* Modals */}
      {showTokensModal && (
        <GetTokensModal
          isOpen={showTokensModal}
          onClose={() => handleFaucetUsage()}
        />
      )}

      <InfoModal
        isOpen={showInfoModal}
        onClose={() => setShowInfoModal(false)}
      />
    </>
  );
}
