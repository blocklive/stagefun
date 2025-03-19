"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { usePrivy, useWallets } from "@privy-io/react-auth";
import {
  FaArrowLeft,
  FaPencilAlt,
  FaImage,
  FaYoutube,
  FaLink,
  FaBold,
  FaItalic,
  FaListUl,
  FaMapMarkerAlt,
  FaTimes,
  FaExclamationTriangle,
  FaPlus,
} from "react-icons/fa";
import Image from "next/image";
import { useSupabase } from "../../../contexts/SupabaseContext";
import { createPool } from "../../../lib/services/pool-service";
import { useAuthenticatedSupabase } from "@/hooks/useAuthenticatedSupabase";
import { Pool } from "@/lib/supabase";
import { v4 as uuidv4 } from "uuid";
import SocialLinksInput from "@/app/components/SocialLinksInput";
import AppHeader from "../../components/AppHeader";
import GetTokensModal from "../../components/GetTokensModal";
import { useContractInteraction } from "../../../contexts/ContractInteractionContext";
import { useNativeBalance } from "../../../hooks/useNativeBalance";
import toast from "react-hot-toast";
import PoolImageUpload from "@/app/components/PoolImageUpload";
import { uploadPoolImage } from "@/lib/utils/imageUpload";
import SideNavbar from "../../components/SideNavbar";
import BottomNavbar from "../../components/BottomNavbar";
import { IoFlash } from "react-icons/io5";
import { useFundWallet } from "@privy-io/react-auth";
import RichTextEditor from "@/app/components/RichTextEditor";
import InfoModal from "../../components/InfoModal";

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
  const { createPoolWithDatabase, isLoading: isContractLoading } =
    useContractInteraction();
  const {
    balance: nativeBalance,
    isLoading: isBalanceLoading,
    refresh: refreshNativeBalance,
  } = useNativeBalance();
  const router = useRouter();
  const [viewportHeight, setViewportHeight] = useState("100vh");
  const [poolName, setPoolName] = useState("");
  const [ticker, setTicker] = useState("");
  const [fundingGoal, setFundingGoal] = useState("");
  const [minCommitment, setMinCommitment] = useState("");
  const [patrons, setPatrons] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [currency] = useState("USDC");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [socialLinks, setSocialLinks] = useState({});
  const { fundWallet } = useFundWallet();

  // Default end date is 2 days from now
  const [endDate, setEndDate] = useState<Date>(
    new Date(new Date().setDate(new Date().getDate() + 2))
  );

  // State to hold the formatted date string for the input
  const [endDateInputValue, setEndDateInputValue] = useState<string>(
    formatDateForInput(endDate)
  );

  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [uniqueId, setUniqueId] = useState<string>(uuidv4());

  const [showGasWarning, setShowGasWarning] = useState(false);
  const [showTokensModal, setShowTokensModal] = useState(false);
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [balanceChecked, setBalanceChecked] = useState(false);
  const [showValidation, setShowValidation] = useState(false);

  // Check if the user has enough gas for deployment
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

  // Update the input value whenever endDate changes
  useEffect(() => {
    setEndDateInputValue(formatDateForInput(endDate));
  }, [endDate]);

  // Set the correct viewport height, accounting for mobile browsers
  useEffect(() => {
    const updateHeight = () => {
      // Use the window's inner height for a more accurate measurement
      setViewportHeight(`${window.innerHeight}px`);
    };

    // Set initial height
    updateHeight();

    // Update on resize
    window.addEventListener("resize", updateHeight);

    // Clean up
    return () => window.removeEventListener("resize", updateHeight);
  }, []);

  // Handle browser back button
  useEffect(() => {
    // Function to handle beforeunload event
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      // Check if the user has entered any data
      if (
        poolName ||
        ticker ||
        fundingGoal ||
        minCommitment ||
        patrons ||
        description ||
        location ||
        selectedImage ||
        Object.keys(socialLinks).length > 0
      ) {
        // Standard way to show a confirmation dialog when leaving the page
        e.preventDefault();
        e.returnValue = "";
        return "";
      }
    };

    // Add event listener
    window.addEventListener("beforeunload", handleBeforeUnload);

    // Clean up
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [
    poolName,
    ticker,
    fundingGoal,
    minCommitment,
    patrons,
    description,
    location,
    selectedImage,
    socialLinks,
  ]);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Check if user is authenticated
      if (!dbUser || !supabase) {
        alert(
          "Please wait for authentication to complete before uploading images"
        );
        return;
      }

      // Validate file type
      if (!file.type.startsWith("image/")) {
        alert("Please select an image file");
        return;
      }

      // Validate file size (50MB limit)
      if (file.size > 50 * 1024 * 1024) {
        alert("Image size should be less than 50MB");
        return;
      }

      setSelectedImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
  };

  const uploadImage = async (file: File): Promise<string | null> => {
    if (!supabase) {
      console.error("Supabase client not available");
      alert("Authentication error. Please try again or refresh the page.");
      return null;
    }

    return uploadPoolImage(file, supabase, setIsUploadingImage);
  };

  const handleSubmit = async (
    e: React.FormEvent<HTMLFormElement> | React.MouseEvent<HTMLButtonElement>
  ) => {
    e.preventDefault();

    // Set validation visibility to true when submit is attempted
    setShowValidation(true);

    if (!dbUser || !supabase || isClientLoading) {
      toast.error("Please wait for authentication to complete");
      return;
    }

    // Validate required fields
    if (!poolName) {
      toast.error("Please enter a pool name");
      return;
    }

    if (!fundingGoal || parseFloat(fundingGoal) <= 0) {
      toast.error("Please enter a valid funding goal");
      return;
    }

    if (!minCommitment || parseFloat(minCommitment) <= 0) {
      toast.error("Please enter a valid minimum commitment");
      return;
    }

    // Check if an image has been selected
    if (!selectedImage) {
      toast.error("Please upload an image for your pool");
      return;
    }

    // Check if user has enough gas for deployment
    if (parseFloat(nativeBalance) < MIN_GAS_BALANCE) {
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
                Your wallet has {parseFloat(nativeBalance).toFixed(4)} MON.
                Deploying a pool requires at least 0.5 MON to pay for gas. Use
                one of the options below to refill your wallet.
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

    try {
      setIsSubmitting(true);

      // Upload image if selected
      let imageUrl = null;
      if (selectedImage) {
        console.log("Uploading selected image...");
        imageUrl = await uploadImage(selectedImage);

        // Stop pool creation if image upload failed
        if (!imageUrl) {
          console.error("Image upload failed, stopping pool creation");
          setIsSubmitting(false);
          return;
        }
      }

      console.log("Proceeding with pool creation, image URL:", imageUrl);

      // Validate end date is in the future
      if (endDate <= new Date()) {
        alert("End date must be in the future");
        setIsSubmitting(false);
        return;
      }

      // Log the end date for debugging
      console.log("End date for pool:", {
        endDate,
        isoString: endDate.toISOString(),
        timestamp: Math.floor(endDate.getTime() / 1000),
      });

      // Create pool data object
      const poolData = {
        id: uniqueId, // Use the UUID as the primary key
        name: poolName,
        ticker: ticker,
        description: description,
        target_amount: parseFloat(fundingGoal), // Store in USDC units
        min_commitment: parseFloat(minCommitment), // Store in USDC units
        currency: currency,
        token_amount: 100000, // Default token amount
        token_symbol: ticker || "$PARTY", // Use the ticker if provided
        location: location,
        venue: "Convergence Station",
        status: "Accepting patrons",
        funding_stage: "Raising",
        ends_at: endDate.toISOString(), // Store as ISO string in Supabase
        creator_id: dbUser.id,
        raised_amount: 0,
        image_url: imageUrl,
        social_links: Object.keys(socialLinks).length > 0 ? socialLinks : null,
      };

      // Convert end date to Unix timestamp (seconds since epoch)
      const endTimeUnix = Math.floor(endDate.getTime() / 1000);
      console.log("End time Unix timestamp:", endTimeUnix);

      // Use the new createPoolWithDatabase function that handles both blockchain and database operations
      const result = await createPoolWithDatabase(poolData, endTimeUnix);

      if (!result.success) {
        console.error("Error creating pool:", result.error);
        toast.error(result.error || "Failed to create pool");

        // If we have a transaction hash but database failed, show special message
        if (result.txHash) {
          toast.error(
            <div>
              <p>
                Warning: Pool was created on blockchain but database entry
                failed.
              </p>
              <p className="text-xs mt-1">
                Please contact support with your transaction hash:{" "}
                {result.txHash}
              </p>
            </div>,
            {
              duration: 10000,
              style: {
                background: "#1E1F25",
                color: "white",
                border: "1px solid rgba(255, 100, 100, 0.3)",
              },
            }
          );
          router.push("/");
        }

        return;
      }

      console.log("Pool created successfully:", result.data);
      toast.success("Pool created successfully!");
      router.push(`/pools/${result.data.id}`);
    } catch (error) {
      console.error("Error:", error);
      toast.error("An error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

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
      selectedImage ||
      Object.keys(socialLinks).length > 0
    );
  };

  // Handle navigation attempts
  const handleNavigationAttempt = (path: string) => {
    if (hasUnsavedChanges()) {
      router.push(path);
      return false; // Prevent navigation
    }
    return true; // Allow navigation
  };

  // Handle back button click
  const handleBackClick = () => {
    router.back();
  };

  // Handle faucet usage
  const handleFaucetUsage = async () => {
    setShowTokensModal(false);
    // Wait a bit for the transaction to be mined
    setTimeout(() => {
      refreshNativeBalance();
    }, 5000);
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
                    Your wallet has {parseFloat(nativeBalance).toFixed(4)} MON.
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
            <PoolImageUpload
              imagePreview={imagePreview}
              isUploadingImage={isUploadingImage}
              onImageSelect={handleImageSelect}
              onRemoveImage={handleRemoveImage}
              placeholderText="YOU ARE INVITED"
              isRequired={true}
              showValidation={showValidation}
            />

            {/* Form */}
            <form
              id="createPoolForm"
              onSubmit={(e) => {
                e.preventDefault();
                handleSubmit(e);
              }}
              className="mt-8"
            >
              {/* Pool Name Input */}
              <div className="mb-6">
                <input
                  type="text"
                  placeholder="Party Round Name"
                  name="name"
                  value={poolName}
                  onChange={(e) => setPoolName(e.target.value)}
                  className="w-full p-4 bg-[#FFFFFF14] rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#836EF9]"
                />
              </div>

              {/* Sticker Input */}
              <div className="mb-6">
                <input
                  type="text"
                  placeholder="$TICKER"
                  name="ticker"
                  value={ticker}
                  onChange={(e) => setTicker(e.target.value)}
                  className="w-full p-4 bg-[#FFFFFF14] rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#836EF9]"
                />
              </div>

              {/* Funding Goal Section */}
              <div className="mb-6">
                <h2 className="text-2xl font-bold mb-4">Funding goal</h2>
                <div className="flex gap-4">
                  {/* Amount Input */}
                  <div className="flex-1 relative">
                    <div className="absolute left-4 top-1/2 transform -translate-y-1/2">
                      <div className="w-8 h-8 bg-[#836EF9] rounded-full flex items-center justify-center">
                        <span className="text-white font-bold">$</span>
                      </div>
                    </div>
                    <input
                      type="text"
                      inputMode="decimal"
                      pattern="[0-9]*\.?[0-9]*"
                      placeholder="0"
                      name="fundingGoal"
                      value={fundingGoal}
                      onChange={(e) => {
                        // Only allow numbers and a single decimal point
                        const value = e.target.value;
                        if (value === "" || /^\d*\.?\d*$/.test(value)) {
                          setFundingGoal(value);
                        }
                      }}
                      className="w-full p-4 pl-16 bg-[#FFFFFF14] rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#836EF9]"
                      style={{ appearance: "textfield" }}
                    />
                    <div className="absolute right-4 top-1/2 transform -translate-y-1/2 flex flex-col gap-1">
                      <button
                        type="button"
                        className="w-6 h-6 bg-[#FFFFFF14] hover:bg-[#FFFFFF1A] rounded-md flex items-center justify-center focus:outline-none transition-colors"
                        onClick={() => {
                          const currentValue = parseFloat(fundingGoal) || 0;
                          setFundingGoal((currentValue + 1).toString());
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
                          const currentValue = parseFloat(fundingGoal) || 0;
                          if (currentValue > 0) {
                            setFundingGoal((currentValue - 1).toString());
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
                  </div>

                  {/* Currency Selector */}
                  <div className="relative">
                    <div className="h-full px-4 bg-[#FFFFFF14] rounded-lg flex items-center gap-2">
                      <div className="w-8 h-8 bg-[#836EF9] rounded-full flex items-center justify-center">
                        <span className="text-white font-bold">$</span>
                      </div>
                      <span>USDC</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Minimum Commitment */}
              <div className="mb-6">
                <div className="relative">
                  <div className="absolute left-4 top-1/2 transform -translate-y-1/2">
                    <div className="w-8 h-8 bg-[#836EF9] rounded-full flex items-center justify-center">
                      <span className="text-white font-bold">$</span>
                    </div>
                  </div>
                  <input
                    type="text"
                    inputMode="decimal"
                    pattern="[0-9]*\.?[0-9]*"
                    placeholder="Minimum commitment"
                    name="minCommitment"
                    value={minCommitment}
                    onChange={(e) => {
                      // Only allow numbers and a single decimal point
                      const value = e.target.value;
                      if (value === "" || /^\d*\.?\d*$/.test(value)) {
                        setMinCommitment(value);
                      }
                    }}
                    className="w-full p-4 pl-16 bg-[#FFFFFF14] rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#836EF9]"
                    style={{ appearance: "textfield" }}
                  />
                  <div className="absolute right-4 top-1/2 transform -translate-y-1/2 flex flex-col gap-1">
                    <button
                      type="button"
                      className="w-6 h-6 bg-[#FFFFFF14] hover:bg-[#FFFFFF1A] rounded-md flex items-center justify-center focus:outline-none transition-colors"
                      onClick={() => {
                        const currentValue = parseFloat(minCommitment) || 0;
                        setMinCommitment((currentValue + 0.1).toFixed(1));
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
                        const currentValue = parseFloat(minCommitment) || 0;
                        if (currentValue > 0.1) {
                          setMinCommitment((currentValue - 0.1).toFixed(1));
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
                </div>
              </div>

              {/* Patrons */}
              <div className="mb-6">
                <input
                  type="text"
                  placeholder="Patrons"
                  name="patrons"
                  value={patrons}
                  onChange={(e) => setPatrons(e.target.value)}
                  className="w-full p-4 bg-[#FFFFFF14] rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#836EF9]"
                />
              </div>

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

              {/* End Time Picker */}
              <div className="mb-6">
                <h2 className="text-2xl font-bold mb-4">End Time</h2>
                <div className="flex gap-4">
                  <input
                    type="datetime-local"
                    value={endDateInputValue}
                    min={formatDateForInput(new Date())}
                    onChange={(e) => {
                      // When the input changes, update both the input value and the Date object
                      setEndDateInputValue(e.target.value);

                      // Parse the input value to a Date object
                      // The input value is in local time, so we need to create a Date object that represents that local time
                      if (e.target.value) {
                        const selectedDate = new Date(e.target.value);
                        console.log(
                          "Selected date from input:",
                          selectedDate.toISOString()
                        );
                        setEndDate(selectedDate);
                      }
                    }}
                    className="w-full p-4 bg-[#FFFFFF14] rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#836EF9]"
                  />
                </div>
                <p className="text-sm text-gray-400 mt-2">
                  Set when your party round will end. After this time, no new
                  commitments will be accepted.
                </p>
              </div>
            </form>
          </div>

          {/* Launch Button - Fixed at bottom on mobile, normal position on desktop */}
          <div className="fixed bottom-0 left-0 right-0 md:static md:mt-8 px-6 py-6 bg-[#15161a] md:px-0 md:py-0 z-10">
            <button
              onClick={handleSubmit}
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
