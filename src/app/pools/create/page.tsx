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
} from "react-icons/fa";
import Image from "next/image";
import { useSupabase } from "../../../contexts/SupabaseContext";
import { createPool } from "../../../lib/services/pool-service";
import { useAuthenticatedSupabase } from "@/hooks/useAuthenticatedSupabase";
import { Pool } from "@/lib/supabase";
import { v4 as uuidv4 } from "uuid";
import SocialLinksInput from "@/components/SocialLinksInput";
import AppHeader from "../../components/AppHeader";

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
  const router = useRouter();
  const [viewportHeight, setViewportHeight] = useState("100vh");
  const [poolName, setPoolName] = useState("");
  const [ticker, setTicker] = useState("");
  const [fundingGoal, setFundingGoal] = useState("");
  const [minCommitment, setMinCommitment] = useState("");
  const [patrons, setPatrons] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [currency, setCurrency] = useState("USDC");
  const [showCurrencyDropdown, setShowCurrencyDropdown] = useState(false);
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

    try {
      setIsUploadingImage(true);
      console.log("Starting image upload...");

      // Create a unique file name
      const fileExt = file.name.split(".").pop();
      const fileName = `${Math.random()
        .toString(36)
        .substring(2)}_${Date.now()}.${fileExt}`;
      // Use just the filename without the pool-images/ prefix since the bucket name is already pool-images
      const filePath = fileName;

      console.log(`Uploading to path: ${filePath}`);

      // Try to upload with the authenticated client first
      let data;
      let error;

      try {
        const result = await supabase.storage
          .from("pool-images")
          .upload(filePath, file, {
            cacheControl: "3600",
            upsert: false,
          });

        data = result.data;
        error = result.error;
      } catch (uploadError) {
        console.error("Initial upload attempt failed:", uploadError);
        error = uploadError;
      }

      // If there's an RLS error, try a different approach
      if (
        error &&
        typeof error === "object" &&
        "message" in error &&
        typeof error.message === "string" &&
        (error.message.includes("security policy") ||
          error.message.includes("permission denied"))
      ) {
        console.log(
          "RLS policy error detected, trying alternative approach..."
        );

        // Create a FormData object
        const formData = new FormData();
        formData.append("file", file);

        // Use fetch API to upload directly to Supabase Storage REST API
        try {
          // Get authentication token from user session
          const {
            data: { session },
          } = await supabase.auth.getSession();
          const token = session?.access_token;

          if (!token) {
            throw new Error("No authentication token available");
          }

          const uploadResponse = await fetch(
            `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/pool-images/${filePath}`,
            {
              method: "POST",
              headers: {
                Authorization: `Bearer ${token}`,
              },
              body: formData,
            }
          );

          if (!uploadResponse.ok) {
            const errorData = await uploadResponse.json();
            throw new Error(`Upload failed: ${JSON.stringify(errorData)}`);
          }

          console.log("Upload successful via REST API");
          error = null;
        } catch (restError) {
          console.error("REST API upload failed:", restError);
          error = restError;
        }
      }

      if (error) {
        console.error("Supabase storage upload error:", error);
        throw error;
      }

      console.log("Upload successful:", data);

      // Get the public URL
      const {
        data: { publicUrl },
      } = supabase.storage.from("pool-images").getPublicUrl(filePath);

      console.log("Generated public URL:", publicUrl);
      return publicUrl;
    } catch (error: any) {
      console.error("Error uploading image:", error);

      // More detailed error message
      let errorMessage = "Failed to upload image. Please try again.";
      if (error?.message) {
        errorMessage += ` Error: ${error.message}`;
      }

      alert(errorMessage);
      return null;
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleSubmit = async (
    e: React.FormEvent<HTMLFormElement> | React.MouseEvent<HTMLButtonElement>
  ) => {
    e.preventDefault();

    if (!dbUser || !supabase || isClientLoading) {
      alert("Please wait for authentication to complete");
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

      // Create pool data directly from state variables
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

      console.log("Submitting pool data:", poolData);

      // Insert the pool using the authenticated client
      const { data, error } = await supabase
        .from("pools")
        .insert(poolData)
        .select()
        .single();

      if (error) {
        console.error("Error creating pool:", error);
        alert("Failed to create pool: " + error.message);
        return;
      }

      console.log("Pool created successfully in database:", data);

      // Now create the pool on the blockchain using the backend API
      try {
        console.log("Creating pool on blockchain via backend API...");

        // Convert end date to Unix timestamp (seconds since epoch)
        const endTimeUnix = Math.floor(endDate.getTime() / 1000);
        console.log("End time Unix timestamp:", endTimeUnix);

        const response = await fetch("/api/blockchain/create-pool", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            poolId: data.id,
            name: poolData.name,
            uniqueId: uniqueId, // Pass the uniqueId to the blockchain
            symbol: poolData.token_symbol,
            endTime: endTimeUnix, // Use Unix timestamp for blockchain
            targetAmount: poolData.target_amount * 1_000_000, // Convert to base units for blockchain
            minCommitment: poolData.min_commitment * 1_000_000, // Convert to base units for blockchain
          }),
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(
            result.error || "Failed to create pool on blockchain"
          );
        }

        console.log("Pool created successfully on blockchain:", result);
      } catch (blockchainError: any) {
        console.error("Error creating pool on blockchain:", blockchainError);
        // We don't want to block the user from proceeding if the blockchain transaction fails
        // Just show a warning
        alert(
          "Warning: Pool was created in the database but blockchain transaction failed. Some features may be limited."
        );
      }

      router.push(`/pools/${data.id}`);
    } catch (error) {
      console.error("Error:", error);
      alert("An error occurred");
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
        {/* Use the new AppHeader component */}
        <AppHeader
          showBackButton={false}
          showTitle={false}
          backgroundColor="#15161a"
        />

        {/* Back button below header */}
        <div className="px-4 py-2">
          <button
            onClick={() => router.back()}
            className="w-12 h-12 bg-[#2A2640] rounded-full flex items-center justify-center text-white"
          >
            <FaArrowLeft />
          </button>
        </div>

        {/* Page Title */}
        <div className="px-6 mt-4">
          <h1 className="text-5xl font-bold">CREATE PARTY ROUND</h1>
        </div>

        {/* Main content */}
        <div className="px-6" style={{ paddingBottom: "100px" }}>
          {/* Pool Image */}
          <div className="mt-8">
            <div className="relative w-full aspect-square bg-purple-500 rounded-lg overflow-hidden">
              {imagePreview ? (
                <>
                  <Image
                    src={imagePreview}
                    alt="Pool preview"
                    fill
                    className="object-cover"
                  />
                  <button
                    onClick={handleRemoveImage}
                    className="absolute top-4 right-4 w-10 h-10 bg-red-500 rounded-full flex items-center justify-center hover:bg-red-600"
                  >
                    <FaTimes className="text-white" />
                  </button>
                </>
              ) : (
                <div className="h-full flex items-center justify-center">
                  <div className="text-4xl font-bold text-center text-[#1E1B2E] p-8">
                    YOU ARE INVITED
                  </div>
                  <label className="absolute bottom-4 right-4 w-12 h-12 bg-[#2A2640] rounded-full flex items-center justify-center cursor-pointer hover:bg-[#3A3650]">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageSelect}
                      className="hidden"
                    />
                    <FaPencilAlt className="text-white" />
                  </label>
                </div>
              )}
            </div>
            {isUploadingImage && (
              <div className="mt-2 text-sm text-gray-400">
                Uploading image...
              </div>
            )}
          </div>

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
                className="w-full p-4 bg-[#2A2640] rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
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
                className="w-full p-4 bg-[#2A2640] rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>

            {/* Funding Goal Section */}
            <div className="mb-6">
              <h2 className="text-2xl font-bold mb-4">Funding goal</h2>
              <div className="flex gap-4">
                {/* Amount Input */}
                <div className="flex-1 relative">
                  <div className="absolute left-4 top-1/2 transform -translate-y-1/2">
                    <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                      <span className="text-white font-bold">$</span>
                    </div>
                  </div>
                  <input
                    type="number"
                    placeholder="0"
                    name="fundingGoal"
                    value={fundingGoal}
                    onChange={(e) => setFundingGoal(e.target.value)}
                    className="w-full p-4 pl-16 bg-[#2A2640] rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                {/* Currency Selector */}
                <div className="relative">
                  <button
                    className="h-full px-4 bg-[#2A2640] rounded-lg flex items-center gap-2"
                    onClick={(e) => {
                      e.preventDefault();
                      setShowCurrencyDropdown(!showCurrencyDropdown);
                    }}
                  >
                    <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                      <span className="text-white font-bold">$</span>
                    </div>
                    <span>{currency}</span>
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                      className={`transition-transform ${
                        showCurrencyDropdown ? "rotate-180" : ""
                      }`}
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

                  {/* Dropdown */}
                  {showCurrencyDropdown && (
                    <div className="absolute top-full right-0 mt-2 w-full bg-[#2A2640] rounded-lg shadow-lg z-10">
                      <button
                        className="w-full p-3 text-left hover:bg-[#3A3650] transition-colors"
                        onClick={(e) => {
                          e.preventDefault();
                          setCurrency("USDC");
                          setShowCurrencyDropdown(false);
                        }}
                      >
                        USDC
                      </button>
                      <button
                        className="w-full p-3 text-left hover:bg-[#3A3650] transition-colors"
                        onClick={(e) => {
                          e.preventDefault();
                          setCurrency("ETH");
                          setShowCurrencyDropdown(false);
                        }}
                      >
                        ETH
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Minimum Commitment */}
            <div className="mb-6">
              <div className="relative">
                <div className="absolute left-4 top-1/2 transform -translate-y-1/2">
                  <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                    <span className="text-white font-bold">$</span>
                  </div>
                </div>
                <input
                  type="text"
                  placeholder="Minimum commitment"
                  name="minCommitment"
                  value={minCommitment}
                  onChange={(e) => setMinCommitment(e.target.value)}
                  className="w-full p-4 pl-16 bg-[#2A2640] rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
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
                className="w-full p-4 bg-[#2A2640] rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>

            {/* Description */}
            <div className="mb-6">
              <h2 className="text-2xl font-bold mb-4">Description</h2>
              <div className="bg-[#2A2640] rounded-lg overflow-hidden">
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
                  <div className="w-8 h-8 bg-[#2A2640] rounded-full flex items-center justify-center">
                    <FaMapMarkerAlt className="text-white" />
                  </div>
                </div>
                <input
                  type="text"
                  placeholder="Location (Optional)"
                  name="location"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full p-4 pl-16 bg-[#2A2640] rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
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
                  className="w-full p-4 bg-[#2A2640] rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
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
          className="w-full py-4 bg-purple-500 rounded-full text-white font-medium text-lg"
          disabled={isSubmitting}
        >
          {isSubmitting ? "Creating..." : "Launch Party Round"}
        </button>
      </div>
    </div>
  );
}
