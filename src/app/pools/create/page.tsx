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
import { IoFlash } from "react-icons/io5";
import { toast } from "react-hot-toast";

// Import our new components
import PoolImageSection from "./components/PoolImageSection";
import PoolDetailsSection from "./components/PoolDetailsSection";
import FundingSection from "./components/FundingSection";
import EndTimeSection from "./components/EndTimeSection";

// Import our new hooks
import usePoolImage from "./hooks/usePoolImage";
import usePoolDetails from "./hooks/usePoolDetails";
import useFunding from "./hooks/useFunding";
import useEndTime from "./hooks/useEndTime";
import usePoolCreation from "./hooks/usePoolCreation";

// Define types for the custom navigation components
interface CustomNavProps {
  activeTab: "party" | "portfolio";
  checkBeforeNavigate: (path: string) => boolean;
}

// Custom wrapper components for navigation
const CustomSideNavbar = ({
  activeTab,
  checkBeforeNavigate,
}: CustomNavProps) => {
  const router = useRouter();

  const handleNavigation = (path: string) => {
    if (checkBeforeNavigate(path)) {
      router.push(path);
    }
  };

  return (
    <nav className="hidden md:flex flex-col h-screen fixed left-0 top-0 w-64 bg-[#15161a] border-r border-gray-800 py-4 px-4">
      {/* Logo */}
      <div
        className="mb-8 px-2 cursor-pointer"
        onClick={() => handleNavigation("/pools")}
      >
        <Image
          src="/stagefunheader.png"
          alt="StageFun Logo"
          width={40}
          height={40}
          className="object-contain"
        />
      </div>

      {/* Navigation Items */}
      <div className="flex flex-col space-y-6">
        {/* Party Rounds */}
        <div
          className="flex items-center cursor-pointer px-4 py-3 rounded-full hover:bg-[#FFFFFF14] transition-colors"
          onClick={() => handleNavigation("/pools")}
        >
          <IoFlash
            className={`text-2xl mr-4 ${
              activeTab === "party" ? "text-[#8B7EF8]" : "text-gray-500"
            }`}
          />
          <span
            className={`text-lg ${
              activeTab === "party" ? "text-[#8B7EF8]" : "text-gray-500"
            }`}
          >
            Party Rounds
          </span>
        </div>

        {/* Portfolio */}
        <div
          className="flex items-center cursor-pointer px-4 py-3 rounded-full hover:bg-[#FFFFFF14] transition-colors"
          onClick={() => handleNavigation("/profile")}
        >
          <div
            className={`text-2xl mr-4 ${
              activeTab === "portfolio" ? "text-[#8B7EF8]" : "text-gray-500"
            }`}
          >
            <svg
              width="28"
              height="28"
              viewBox="0 0 28 28"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <rect
                x="6"
                y="6"
                width="16"
                height="16"
                stroke="currentColor"
                strokeWidth="2"
              />
              <path
                d="M6 18L12 12L16 16L22 10"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <span
            className={`text-lg ${
              activeTab === "portfolio" ? "text-[#8B7EF8]" : "text-gray-500"
            }`}
          >
            Portfolio
          </span>
        </div>
      </div>
    </nav>
  );
};

const CustomBottomNavbar = ({
  activeTab,
  checkBeforeNavigate,
}: CustomNavProps) => {
  const router = useRouter();

  const handleNavigation = (path: string) => {
    if (checkBeforeNavigate(path)) {
      router.push(path);
    }
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 flex justify-around items-center py-5 px-4 bg-[#15161a] border-t border-gray-800 md:hidden">
      {/* Party Rounds */}
      <div
        className="flex flex-col items-center cursor-pointer"
        onClick={() => handleNavigation("/pools")}
      >
        <div className="flex flex-col items-center">
          <IoFlash
            className={`text-2xl ${
              activeTab === "party" ? "text-[#8B7EF8]" : "text-gray-500"
            }`}
          />
          <span
            className={`text-sm mt-1 ${
              activeTab === "party" ? "text-[#8B7EF8]" : "text-gray-500"
            }`}
          >
            Party Rounds
          </span>
        </div>
      </div>

      {/* Portfolio (links to profile) */}
      <div
        className="flex flex-col items-center cursor-pointer"
        onClick={() => handleNavigation("/profile")}
      >
        <div className="flex flex-col items-center">
          <div
            className={`text-2xl ${
              activeTab === "portfolio" ? "text-[#8B7EF8]" : "text-gray-500"
            }`}
          >
            <svg
              width="28"
              height="28"
              viewBox="0 0 28 28"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <rect
                x="6"
                y="6"
                width="16"
                height="16"
                stroke="currentColor"
                strokeWidth="2"
              />
              <path
                d="M6 18L12 12L16 16L22 10"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <span
            className={`text-sm mt-1 ${
              activeTab === "portfolio" ? "text-[#8B7EF8]" : "text-gray-500"
            }`}
          >
            Portfolio
          </span>
        </div>
      </div>
    </nav>
  );
};

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
  const { client: supabase, isLoading: isClientLoading } =
    useAuthenticatedSupabase();
  const { fundWallet } = useFundWallet();
  const router = useRouter();
  const [viewportHeight, setViewportHeight] = useState("100vh");
  const [socialLinks, setSocialLinks] = useState({});
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [showTokensModal, setShowTokensModal] = useState(false);
  const [showInfoModal, setShowInfoModal] = useState(false);

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

  const { poolName, ticker, patrons, setPoolName, setTicker, setPatrons } =
    usePoolDetails();

  const { fundingGoal, minCommitment, setFundingGoal, setMinCommitment } =
    useFunding();

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
        minCommitment ||
        patrons ||
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
    minCommitment,
    patrons,
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
      minCommitment ||
      patrons ||
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

    // Create pool data object
    const poolData = {
      id: uniqueId,
      name: poolName,
      ticker: ticker,
      description: description,
      target_amount: parseFloat(fundingGoal),
      min_commitment: parseFloat(minCommitment),
      currency: "USDC",
      token_amount: 100000,
      token_symbol: ticker || "$PARTY",
      location: location,
      venue: "Convergence Station",
      status: "Accepting patrons",
      funding_stage: "Raising",
      ends_at: endDate.toISOString(),
      creator_id: dbUser?.id,
      raised_amount: 0,
      image_url: null as string | null, // Will be set after image upload
      social_links: Object.keys(socialLinks).length > 0 ? socialLinks : null,
    };

    // Upload image if selected
    let imageUrl = null;
    if (selectedImage) {
      imageUrl = await uploadImage(selectedImage);
      if (!imageUrl) {
        return;
      }
      poolData.image_url = imageUrl;
    }

    // Convert end date to Unix timestamp
    const endTimeUnix = Math.floor(endDate.getTime() / 1000);

    // Check if user has enough gas for deployment
    if (parseFloat(balance) < 0.5) {
      // Show a toast notification instead of an alert
      toast(
        (t) => (
          <div className="flex items-start">
            <div className="bg-[#836EF9] bg-opacity-20 p-2 rounded-full mr-3 mt-1">
              <FaExclamationTriangle className="text-[#836EF9]" size={16} />
            </div>
            <div>
              <h3 className="font-bold text-white">Low MON Balance</h3>
              <p className="text-sm text-gray-300">
                Your wallet has {parseFloat(balance).toFixed(4)} MON. Deploying
                a pool requires at least 0.5 MON to pay for gas. Use one of the
                options below to refill your wallet.
              </p>
            </div>
          </div>
        ),
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

    // Submit the pool
    await handleSubmit(poolData, endTimeUnix);
  };

  return (
    <div className="min-h-screen bg-[#15161a] text-white">
      <CustomSideNavbar
        activeTab="party"
        checkBeforeNavigate={(path) => handleNavigationAttempt(path)}
      />

      <div className="md:pl-64">
        <AppHeader
          showBackButton={false}
          showTitle={false}
          backgroundColor="#15161a"
          showGetTokensButton={true}
          onGetTokensClick={() => setShowTokensModal(true)}
          onInfoClick={() => setShowInfoModal(true)}
        />

        {/* Main Content */}
        <div className="px-4 pb-24 md:pb-8">
          {/* Back button below header */}
          <div className="py-2">
            <button
              onClick={handleBackClick}
              className="w-12 h-12 bg-[#FFFFFF14] rounded-full flex items-center justify-center text-white hover:bg-[#FFFFFF1A] transition-colors"
            >
              <FaArrowLeft />
            </button>
          </div>

          {/* Page Title */}
          <div className="px-2 mt-4">
            <h1 className="text-5xl font-bold">CREATE PARTY ROUND</h1>
          </div>

          {/* Gas Warning Banner - Only show when balance check is complete and balance is low */}
          {balanceChecked && showGasWarning && (
            <div className="mx-6 mt-4 p-4 bg-[#1E1F25] border border-[#836EF9] border-opacity-50 rounded-lg">
              <div className="flex items-center">
                <div className="w-10 h-10 bg-[#836EF9] bg-opacity-20 rounded-full flex items-center justify-center flex-shrink-0 mr-3">
                  <FaExclamationTriangle className="text-[#836EF9]" size={18} />
                </div>
                <div>
                  <h3 className="font-bold text-white">Low MON Balance</h3>
                  <p className="text-sm text-gray-300">
                    Your wallet has {parseFloat(balance).toFixed(4)} MON.
                    Deploying a pool requires at least 0.5 MON to pay for gas.
                    Use one of the options below to refill your wallet.
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
          )}

          {/* Main content */}
          <div className="px-6" style={{ paddingBottom: "100px" }}>
            {/* Pool Image */}
            <div className="mt-8">
              <h2 className="text-2xl font-bold mb-4">Pool Image</h2>
              <PoolImageSection
                imagePreview={imagePreview}
                isUploadingImage={isUploadingImage}
                showValidation={showValidation}
                onImageSelect={handleImageSelect}
                onRemoveImage={handleRemoveImage}
              />
            </div>

            {/* Form */}
            <form id="createPoolForm" onSubmit={onSubmit} className="mt-8">
              {/* Pool Details */}
              <PoolDetailsSection
                poolName={poolName}
                ticker={ticker}
                patrons={patrons}
                onPoolNameChange={setPoolName}
                onTickerChange={setTicker}
                onPatronsChange={setPatrons}
              />

              {/* Funding Section */}
              <FundingSection
                fundingGoal={fundingGoal}
                minCommitment={minCommitment}
                onFundingGoalChange={setFundingGoal}
                onMinCommitmentChange={setMinCommitment}
              />

              {/* Description */}
              <div className="mb-6">
                <h2 className="text-2xl font-bold mb-4">Description</h2>
                <RichTextEditor
                  content={description}
                  onChange={setDescription}
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
                <SocialLinksInput
                  value={socialLinks}
                  onChange={setSocialLinks}
                />
              </div>

              {/* End Time */}
              <EndTimeSection
                endDateInputValue={endDateInputValue}
                onEndDateChange={handleEndDateChange}
              />
            </form>
          </div>

          {/* Launch Button */}
          <div className="fixed bottom-0 left-0 right-0 md:static md:mt-8 px-6 py-6 bg-[#15161a] md:px-0 md:py-0 z-10">
            <button
              onClick={onSubmit}
              className="w-full py-4 bg-[#836EF9] hover:bg-[#7058E8] rounded-full text-white font-medium text-lg transition-colors"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Creating..." : "Launch Party Round"}
            </button>
          </div>
        </div>
      </div>

      <CustomBottomNavbar
        activeTab="party"
        checkBeforeNavigate={(path) => handleNavigationAttempt(path)}
      />

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
    </div>
  );
}
