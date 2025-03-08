"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { usePrivy, useFundWallet } from "@privy-io/react-auth";
import {
  FaArrowLeft,
  FaEdit,
  FaTwitter,
  FaSignOutAlt,
  FaWallet,
  FaCopy,
  FaTimes,
  FaKey,
  FaCheck,
} from "react-icons/fa";
import Image from "next/image";
import { useSupabase } from "../../contexts/SupabaseContext";
import { getUserPools } from "../../lib/services/pool-service";
import { Pool, User } from "../../lib/supabase";
import { createOrUpdateUser } from "../../lib/services/user-service";
import BottomNavbar from "../components/BottomNavbar";

export default function ProfilePage() {
  const router = useRouter();
  const {
    user: privyUser,
    authenticated,
    ready,
    logout,
    exportWallet,
  } = usePrivy();
  const { fundWallet } = useFundWallet();
  const { dbUser, isLoadingUser, refreshUser } = useSupabase();
  const [viewportHeight, setViewportHeight] = useState("100vh");
  const [activeTab, setActiveTab] = useState("hosted");
  const [userPools, setUserPools] = useState<Pool[]>([]);
  const [isLoadingPools, setIsLoadingPools] = useState(true);
  const [copied, setCopied] = useState(false);
  const walletAddress = privyUser?.wallet?.address;

  // Avatar upload state
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Set the correct viewport height, accounting for mobile browsers
  useEffect(() => {
    const updateHeight = () => {
      setViewportHeight(`${window.innerHeight}px`);
    };

    updateHeight();
    window.addEventListener("resize", updateHeight);
    return () => window.removeEventListener("resize", updateHeight);
  }, []);

  // Fetch user's pools
  useEffect(() => {
    async function fetchUserPools() {
      if (dbUser) {
        setIsLoadingPools(true);
        try {
          const pools = await getUserPools(dbUser.id);
          setUserPools(pools);
        } catch (error) {
          console.error("Error fetching user pools:", error);
        } finally {
          setIsLoadingPools(false);
        }
      }
    }

    fetchUserPools();
  }, [dbUser]);

  if (!ready || isLoadingUser) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#121212]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  if (!authenticated || !dbUser) {
    router.push("/");
    return null;
  }

  const user = dbUser;
  const displayName = user?.name || "Anonymous";

  // Handle image selection
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
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

      // Upload the image immediately
      uploadImage(file);
    }
  };

  // Handle image removal
  const handleRemoveImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
  };

  // Upload image to Supabase
  const uploadImage = async (file: File) => {
    if (!dbUser || !privyUser) {
      alert("You must be logged in to upload an avatar");
      return;
    }

    try {
      setIsUploadingImage(true);
      console.log("Starting avatar upload...");

      // Create a unique file name
      const fileExt = file.name.split(".").pop();
      const fileName = `${dbUser.id}_${Date.now()}.${fileExt}`;
      // Use just the filename without any prefix
      const filePath = fileName;

      console.log(`Uploading to path: ${filePath}`);

      // Get Supabase client from window object
      const supabase = (window as any).supabase;

      if (!supabase) {
        throw new Error("Supabase client not available");
      }

      // Try direct fetch upload first
      try {
        console.log("Trying direct fetch upload...");

        // Create a FormData object
        const formData = new FormData();
        formData.append("file", file);

        // Get the anon key from the environment
        const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

        if (!anonKey) {
          throw new Error("Supabase anon key not available");
        }

        // Use fetch API to upload directly to Supabase Storage REST API
        // Note: The correct URL format is /storage/v1/object/user-images (without 'public/')
        const uploadResponse = await fetch(
          `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/user-images/${filePath}`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${anonKey}`,
            },
            body: formData,
          }
        );

        if (!uploadResponse.ok) {
          const errorText = await uploadResponse.text();
          console.error("Direct fetch upload failed:", errorText);
          throw new Error(`Upload failed: ${errorText}`);
        }

        console.log("Upload successful via direct fetch");

        // Get the public URL - use the correct format
        const publicUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/user-images/${filePath}`;

        console.log("Generated public URL:", publicUrl);

        // Update user avatar directly in the UI first
        setImagePreview(publicUrl);

        // Update the user record directly using Supabase client
        console.log("Updating user record directly with Supabase client");
        const { data: updateData, error: updateError } = await supabase
          .from("users")
          .update({ avatar_url: publicUrl })
          .eq("id", dbUser.id)
          .select()
          .single();

        if (updateError) {
          console.error("Direct update failed:", updateError);

          // Try the API route as a fallback
          try {
            console.log("Trying API route as fallback...");
            const updateResponse = await fetch("/api/update-user-avatar", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                userId: dbUser.id,
                avatarUrl: publicUrl,
              }),
            });

            if (!updateResponse.ok) {
              const responseText = await updateResponse.text();
              console.error("API route update failed:", responseText);
              throw new Error(`API update failed: ${responseText}`);
            }

            console.log("User updated via API route");
          } catch (apiError) {
            console.error("API route update failed:", apiError);
            // Continue anyway since the image was uploaded
          }
        } else {
          console.log("User updated successfully:", updateData);
        }

        // Refresh user data in context
        await refreshUser();

        // Show success message
        alert("Avatar updated successfully!");
        return;
      } catch (fetchError) {
        console.error("Direct fetch upload failed:", fetchError);
        // Continue to try other methods
      }

      // Try to upload with the authenticated client
      try {
        console.log("Trying Supabase client upload...");
        const { data, error } = await supabase.storage
          .from("user-images")
          .upload(filePath, file, {
            cacheControl: "3600",
            upsert: true, // Overwrite if exists
          });

        if (error) {
          console.error("Supabase client upload error:", error);
          throw error;
        }

        console.log("Upload successful via Supabase client:", data);

        // Get the public URL
        const {
          data: { publicUrl },
        } = supabase.storage.from("user-images").getPublicUrl(filePath);

        console.log("Generated public URL:", publicUrl);

        // Update user avatar directly in the UI
        setImagePreview(publicUrl);

        // Update the user record directly using Supabase client
        console.log("Updating user record directly with Supabase client");
        const { data: updateData, error: updateError } = await supabase
          .from("users")
          .update({ avatar_url: publicUrl })
          .eq("id", dbUser.id)
          .select()
          .single();

        if (updateError) {
          console.error("Direct update failed:", updateError);

          // Try the API route as a fallback
          try {
            console.log("Trying API route as fallback...");
            const updateResponse = await fetch("/api/update-user-avatar", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                userId: dbUser.id,
                avatarUrl: publicUrl,
              }),
            });

            if (!updateResponse.ok) {
              const responseText = await updateResponse.text();
              console.error("API route update failed:", responseText);
              throw new Error(`API update failed: ${responseText}`);
            }

            console.log("User updated via API route");
          } catch (apiError) {
            console.error("API route update failed:", apiError);
            // Continue anyway since the image was uploaded
          }
        } else {
          console.log("User updated successfully:", updateData);
        }

        // Refresh user data in context
        await refreshUser();

        // Show success message
        alert("Avatar updated successfully!");
      } catch (supabaseError) {
        console.error("Supabase client upload error:", supabaseError);
        alert("Failed to upload avatar. Please try again.");
      }
    } catch (error) {
      console.error("Error uploading avatar:", error);
      alert("Failed to upload avatar. Please try again.");
    } finally {
      setIsUploadingImage(false);
      // Don't reset the image preview so the user can see the uploaded image
      // setSelectedImage(null);
      // setImagePreview(null);
    }
  };

  // Function to handle export wallet
  const handleExportWallet = () => {
    if (privyUser?.wallet?.address) {
      exportWallet({ address: privyUser.wallet.address });
    }
  };

  return (
    <div
      className="flex flex-col bg-[#0F0D1B] text-white"
      style={{ minHeight: viewportHeight }}
    >
      {/* Profile Header with Avatar and Name */}
      <div className="relative pt-12 pb-8 flex flex-col items-center bg-purple-900">
        {/* Back Button */}
        <button
          onClick={() => router.back()}
          className="absolute top-6 left-6 w-10 h-10 bg-[#2A2640] rounded-full flex items-center justify-center"
        >
          <FaArrowLeft className="text-white" />
        </button>

        {/* Logout Button in Top Right */}
        <button
          onClick={() => logout()}
          className="absolute top-6 right-6 w-10 h-10 bg-[#2A2640] rounded-full flex items-center justify-center"
          aria-label="Logout"
        >
          <FaSignOutAlt className="text-white" />
        </button>

        {/* Profile Picture */}
        <div className="relative mb-4">
          <div className="w-28 h-28 rounded-full bg-purple-600 overflow-hidden">
            {imagePreview ? (
              <Image
                src={imagePreview}
                alt="Profile Preview"
                width={112}
                height={112}
                className="object-cover w-full h-full"
                unoptimized={true}
              />
            ) : user?.avatar_url ? (
              <Image
                src={user.avatar_url}
                alt="Profile"
                width={112}
                height={112}
                className="object-cover w-full h-full"
                unoptimized={true}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-3xl font-bold">
                {displayName.charAt(0)}
              </div>
            )}

            {isUploadingImage && (
              <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-white"></div>
              </div>
            )}
          </div>

          <input
            type="file"
            accept="image/*"
            onChange={handleImageSelect}
            className="hidden"
            ref={fileInputRef}
          />

          <button
            className="absolute bottom-0 right-0 w-8 h-8 bg-white rounded-full flex items-center justify-center"
            onClick={() => fileInputRef.current?.click()}
          >
            <FaEdit className="text-purple-600" />
          </button>
        </div>

        {/* Username */}
        <h1 className="text-3xl font-bold">{displayName}</h1>

        {/* Twitter handle if available */}
        {user?.twitter_username && (
          <div className="flex items-center mt-1 text-gray-300">
            <FaTwitter className="mr-2" />
            <span>@{user.twitter_username}</span>
          </div>
        )}

        {/* Wallet Action Buttons */}
        <div className="mt-4 flex items-center space-x-8">
          {/* Receive Funds Button */}
          <button
            onClick={() => {
              if (walletAddress) {
                fundWallet(walletAddress, {
                  chain: {
                    id: 10143,
                  },
                  asset: "USDC",
                  uiConfig: {
                    receiveFundsTitle: "Receive USDC on Monad",
                    receiveFundsSubtitle:
                      "Scan this QR code or copy your wallet address to receive USDC on Monad Testnet.",
                  },
                });
              }
            }}
            className="flex flex-col items-center"
            aria-label="Receive Funds"
          >
            <div className="w-12 h-12 flex items-center justify-center bg-gray-800 hover:bg-gray-700 rounded-full text-white transition-colors mb-1">
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M12 17L12 7"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
                <path
                  d="M7 12L12 17L17 12"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M5 20H19"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            </div>
            <span className="text-xs text-gray-400">Receive</span>
          </button>

          {/* Export Keys Button */}
          <button
            onClick={handleExportWallet}
            className="flex flex-col items-center"
            aria-label="Export Keys"
          >
            <div className="w-12 h-12 flex items-center justify-center bg-gray-800 hover:bg-gray-700 rounded-full text-white transition-colors mb-1">
              <FaKey className="text-xl" />
            </div>
            <span className="text-xs text-gray-400">Export</span>
          </button>
        </div>

        {/* Wallet Address Section */}
        {walletAddress && (
          <div className="mt-4 flex flex-col items-center">
            <div className="text-sm text-gray-400 mb-2">
              Your Wallet Address
            </div>
            <div className="flex items-center bg-[#2A2640] rounded-lg px-4 py-2">
              <code className="text-sm font-mono">
                {`${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`}
              </code>
              <button
                onClick={async () => {
                  await navigator.clipboard.writeText(walletAddress);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                }}
                className="ml-2 text-gray-400 hover:text-white"
              >
                {copied ? <FaCheck /> : <FaCopy />}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-800">
        <button
          className={`flex-1 py-4 text-center font-medium ${
            activeTab === "hosted"
              ? "text-white border-b-2 border-purple-500"
              : "text-gray-400"
          }`}
          onClick={() => setActiveTab("hosted")}
        >
          Hosted
        </button>
        <button
          className={`flex-1 py-4 text-center font-medium ${
            activeTab === "funded"
              ? "text-white border-b-2 border-purple-500"
              : "text-gray-400"
          }`}
          onClick={() => setActiveTab("funded")}
        >
          Funded
        </button>
      </div>

      {/* Pool List */}
      <div className="flex-1 p-4">
        {isLoadingPools ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-purple-500"></div>
          </div>
        ) : userPools.length > 0 ? (
          <div className="space-y-4">
            {userPools.map((pool) => (
              <div
                key={pool.id}
                className="bg-gray-800 rounded-lg overflow-hidden"
                onClick={() => router.push(`/pools/${pool.id}`)}
              >
                <div className="p-4 flex items-center">
                  <div className="w-12 h-12 bg-purple-600 rounded-full flex-shrink-0 flex items-center justify-center">
                    {pool.image_url ? (
                      <Image
                        src={pool.image_url}
                        alt={pool.name}
                        width={48}
                        height={48}
                        className="object-cover w-full h-full rounded-full"
                      />
                    ) : (
                      <span className="text-lg font-bold">
                        {pool.name.charAt(0)}
                      </span>
                    )}
                  </div>
                  <div className="ml-4 flex-1">
                    <h3 className="font-bold">{pool.name}</h3>
                    <div className="flex items-center text-sm">
                      <span className="text-gray-400">• {pool.status}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold">
                      {Math.round(
                        (pool.raised_amount / pool.target_amount) * 100
                      )}
                      %
                    </div>
                  </div>
                </div>
                {/* Progress bar */}
                <div className="w-full bg-gray-700 h-1">
                  <div
                    className="bg-purple-500 h-1"
                    style={{
                      width: `${Math.min(
                        (pool.raised_amount / pool.target_amount) * 100,
                        100
                      )}%`,
                    }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-400">
            {activeTab === "hosted"
              ? "You haven't created any pools yet."
              : "You haven't funded any pools yet."}
          </div>
        )}
      </div>

      {/* Add BottomNavbar at the end of the component */}
      <BottomNavbar activeTab="portfolio" />
    </div>
  );
}
