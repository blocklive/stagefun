"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { usePrivy } from "@privy-io/react-auth";
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
} from "react-icons/fa";
import Image from "next/image";
import { useSupabase } from "../../../contexts/SupabaseContext";
import { createPool } from "../../../lib/services/pool-service";
import { useAuthenticatedSupabase } from "@/hooks/useAuthenticatedSupabase";
import { Pool } from "@/lib/supabase";
import { v4 as uuidv4 } from "uuid";
import SocialLinksInput from "@/components/SocialLinksInput";
import AppHeader from "../../components/AppHeader";
import GetTokensModal from "../../components/GetTokensModal";
import { useContractInteraction } from "../../../contexts/ContractInteractionContext";
import { useNativeBalance } from "../../../hooks/useNativeBalance";
import toast from "react-hot-toast";
import PoolImageUpload from "@/components/PoolImageUpload";
import { uploadPoolImage } from "@/lib/utils/imageUpload";

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
  const { balance: nativeBalance, isLoading: isBalanceLoading } =
    useNativeBalance();
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
  const [balanceChecked, setBalanceChecked] = useState(false);

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

    if (!dbUser || !supabase || isClientLoading) {
      toast.error("Please wait for authentication to complete");
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
                Deploying a pool requires MON to pay for gas.
              </p>
              <p className="text-xs text-gray-400 mt-1">
                Get 0.5 MON from our faucet to continue.
              </p>
              <div className="mt-2 flex space-x-2">
                <button
                  onClick={() => {
                    toast.dismiss(t.id);
                    setShowTokensModal(true);
                  }}
                  className="px-3 py-1 bg-[#836EF9] hover:bg-[#7058E8] rounded-full text-xs text-white transition-colors"
                >
                  Get MON
                </button>
                <button
                  onClick={() => toast.dismiss(t.id)}
                  className="px-3 py-1 bg-[#FFFFFF14] hover:bg-[#FFFFFF1A] rounded-full text-xs text-white transition-colors"
                >
                  Dismiss
                </button>
              </div>
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

  return (
    <div
      className="flex flex-col bg-[#15161a] text-white relative"
      style={{ height: viewportHeight }}
    >
      <div className="flex-1 overflow-y-auto">
        {/* Use the AppHeader component with tokens button */}
        <AppHeader
          showBackButton={false}
          showTitle={false}
          showGetTokensButton={true}
          onGetTokensClick={() => setShowTokensModal(true)}
          backgroundColor="#15161a"
        />

        {/* Back button below header */}
        <div className="px-4 py-2">
          <button
            onClick={() => router.back()}
            className="w-12 h-12 bg-[#FFFFFF14] rounded-full flex items-center justify-center text-white hover:bg-[#FFFFFF1A] transition-colors"
          >
            <FaArrowLeft />
          </button>
        </div>

        {/* Page Title */}
        <div className="px-6 mt-4">
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
                  Deploying a pool requires MON to pay for gas. Get 0.5 MON from
                  our faucet to continue.
                </p>
              </div>
            </div>
            <div className="mt-3 space-y-2">
              <button
                onClick={() => setShowTokensModal(true)}
                className="w-full py-2 px-3 bg-[#836EF9] hover:bg-[#7058E8] rounded-full text-center text-sm transition-colors"
              >
                Get MON and USDC
              </button>
              <a
                href="https://faucet.monad.xyz/"
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full py-2 px-3 bg-[#FFFFFF14] hover:bg-[#FFFFFF1A] rounded-full text-center text-sm transition-colors"
              >
                Monad Testnet Faucet
              </a>
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
          />

          {/* Form */}
          <form id="createPoolForm" onSubmit={handleSubmit} className="mt-8">
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
                      className="w-6 h-6 bg-[#2A2640] hover:bg-[#3A3650] rounded-md flex items-center justify-center focus:outline-none transition-colors"
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
                      className="w-6 h-6 bg-[#2A2640] hover:bg-[#3A3650] rounded-md flex items-center justify-center focus:outline-none transition-colors"
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
                    className="w-6 h-6 bg-[#2A2640] hover:bg-[#3A3650] rounded-md flex items-center justify-center focus:outline-none transition-colors"
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
                    className="w-6 h-6 bg-[#2A2640] hover:bg-[#3A3650] rounded-md flex items-center justify-center focus:outline-none transition-colors"
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
              <div className="bg-[#FFFFFF14] rounded-lg overflow-hidden">
                <textarea
                  placeholder="Write your story..."
                  name="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full p-4 bg-transparent text-white placeholder-gray-400 focus:outline-none min-h-[200px] resize-none"
                />

                {/* Text formatting toolbar */}
                <div className="flex items-center p-2 border-t border-gray-700">
                  <button className="p-2 text-gray-400 hover:text-white">
                    <FaBold />
                  </button>
                  <button className="p-2 text-gray-400 hover:text-white">
                    <FaItalic />
                  </button>
                  <button className="p-2 text-gray-400 hover:text-white">
                    <FaListUl />
                  </button>
                  <button className="p-2 text-gray-400 hover:text-white">
                    <FaLink />
                  </button>
                  <button className="p-2 text-gray-400 hover:text-white">
                    <FaYoutube />
                  </button>
                  <button className="p-2 text-gray-400 hover:text-white">
                    <FaImage />
                  </button>
                </div>
              </div>
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
      </div>

      {/* Launch Button - Fixed at bottom */}
      <div className="absolute bottom-0 left-0 right-0 px-6 py-6 bg-[#15161a]">
        <button
          onClick={handleSubmit}
          className="w-full py-4 bg-[#836EF9] hover:bg-[#7058E8] rounded-full text-white font-medium text-lg transition-colors"
          disabled={isSubmitting}
        >
          {isSubmitting ? "Creating..." : "Launch Party Round"}
        </button>
      </div>

      {/* Get Tokens Modal */}
      <GetTokensModal
        isOpen={showTokensModal}
        onClose={() => setShowTokensModal(false)}
      />
    </div>
  );
}
