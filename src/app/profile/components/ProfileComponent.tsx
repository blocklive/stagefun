"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
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
  FaSync,
} from "react-icons/fa";
import Image from "next/image";
import { useSupabase } from "../../../contexts/SupabaseContext";
import { getUserPools } from "../../../lib/services/pool-service";
import { Pool, User } from "../../../lib/supabase";
import {
  createOrUpdateUser,
  getUserById,
} from "../../../lib/services/user-service";
import BottomNavbar from "../../components/BottomNavbar";
import { useUserAssets } from "../../../hooks/useUserAssets";
import AppHeader from "../../components/AppHeader";
import { useUserHostedPools } from "../../../hooks/useUserHostedPools";

export default function ProfileComponent() {
  const router = useRouter();
  const params = useParams();
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
  const [isLoadingPools, setIsLoadingPools] = useState(true);
  const [copied, setCopied] = useState(false);
  const walletAddress = privyUser?.wallet?.address;

  // Avatar upload state
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Get the user ID from the URL if present
  const profileUserId = params?.id as string;

  // Determine if the user is viewing their own profile
  const isOwnProfile =
    !profileUserId || (dbUser && profileUserId === dbUser.id);

  // Add some debugging
  useEffect(() => {
    console.log("Profile page params:", params);
    console.log("Profile user ID:", profileUserId);
    console.log("Is own profile:", isOwnProfile);
    console.log("Current user ID:", dbUser?.id);
  }, [params, profileUserId, isOwnProfile, dbUser]);

  // Get the user to display (either the current user or the profile being viewed)
  const [profileUser, setProfileUser] = useState<User | null>(null);
  const [isLoadingProfileUser, setIsLoadingProfileUser] = useState(false);

  // Use our new hook to fetch user hosted pools - pass the user ID directly
  const userId = profileUser?.id || dbUser?.id;
  const {
    pools: userHostedPools,
    isLoading: isUserPoolsLoading,
    error: userPoolsError,
    refresh: refreshUserPools,
    isRpcError,
    isUsingCache,
  } = useUserHostedPools(userId);

  const {
    assets,
    totalBalance,
    isLoading: isLoadingAssets,
    isUsingCachedBalance,
    refreshUsdcBalance,
  } = useUserAssets();

  // Set the correct viewport height, accounting for mobile browsers
  useEffect(() => {
    const updateHeight = () => {
      setViewportHeight(`${window.innerHeight}px`);
    };

    updateHeight();
    window.addEventListener("resize", updateHeight);
    return () => window.removeEventListener("resize", updateHeight);
  }, []);

  // Fetch profile user data if viewing someone else's profile
  useEffect(() => {
    async function fetchProfileUser() {
      if (!profileUserId) {
        console.log("No profile user ID, using current user");
        setProfileUser(dbUser);
        return;
      }

      if (dbUser && profileUserId === dbUser.id) {
        console.log("Profile ID matches current user, using current user");
        setProfileUser(dbUser);
        return;
      }

      console.log("Fetching profile for user ID:", profileUserId);
      setIsLoadingProfileUser(true);
      try {
        const user = await getUserById(profileUserId);
        console.log("Fetched profile user:", user);

        if (!user) {
          console.error("User not found with ID:", profileUserId);
          // Redirect to 404 or home page if user not found
          router.push("/");
          return;
        }

        setProfileUser(user);
      } catch (error) {
        console.error("Error fetching profile user:", error);
        // Redirect to 404 or home page on error
        router.push("/");
      } finally {
        setIsLoadingProfileUser(false);
      }
    }

    if (ready && dbUser) {
      fetchProfileUser();
    }
  }, [profileUserId, dbUser, ready, router]);

  // Add a useEffect for handling redirects when not authenticated
  useEffect(() => {
    if (ready && !authenticated && !dbUser) {
      const timer = setTimeout(() => {
        router.push("/");
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [router, ready, authenticated, dbUser]);

  if (!ready || isLoadingUser) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#121212]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  if (!authenticated || !dbUser) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#121212] flex-col">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500 mb-4"></div>
        <p className="text-white">Please log in to view profiles</p>
      </div>
    );
  }

  // Use the appropriate user data for display
  const user = profileUser || dbUser;
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

  // Format amount for display
  const formatAmount = (amount: number) => {
    if (amount >= 1000000) {
      return `${(amount / 1000000).toFixed(1)}M`;
    } else if (amount >= 1000) {
      return `${(amount / 1000).toFixed(1)}K`;
    }
    return amount.toString();
  };

  // Function to determine pool status based on end date
  const getPoolStatus = (endsAt: string) => {
    const now = new Date();
    const endDate = new Date(endsAt);
    return now > endDate ? "Trading" : "Raising";
  };

  return (
    <div
      className="flex flex-col bg-[#0F0D1B] text-white"
      style={{ minHeight: viewportHeight }}
    >
      {/* Profile Header with Avatar and Name */}
      <div className="relative pt-12 pb-8 flex flex-col items-center bg-gradient-to-b from-[#1A0B3E] to-[#4A2A9A]">
        {/* Use AppHeader without back button */}
        <div className="absolute top-0 left-0 right-0">
          <AppHeader
            showBackButton={false}
            showTitle={false}
            className="bg-transparent"
          />
        </div>

        {/* Back button below header */}
        <div className="absolute top-16 left-4">
          <button
            onClick={() => router.back()}
            className="w-12 h-12 bg-[#2A2640] rounded-full flex items-center justify-center text-white"
          >
            <FaArrowLeft />
          </button>
        </div>

        {/* Only show Logout Button if viewing own profile */}
        {isOwnProfile && (
          <button
            onClick={() => logout()}
            className="absolute top-4 right-4 w-10 h-10 bg-[#2A2640] rounded-full flex items-center justify-center"
            aria-label="Logout"
          >
            <FaSignOutAlt className="text-white" />
          </button>
        )}

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

          {/* Only show edit button if viewing own profile */}
          {isOwnProfile && (
            <>
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
            </>
          )}
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

        {/* Only show Wallet Action Buttons if viewing own profile */}
        {isOwnProfile && walletAddress && (
          <>
            {/* Wallet Action Buttons */}
            <div className="mt-4 flex items-center space-x-8 justify-center">
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
          </>
        )}
      </div>

      {/* Balance and Assets Section */}
      {isOwnProfile && (
        <div className="px-4 py-6 bg-black">
          <h2 className="text-xl text-gray-400 mb-2">Balance</h2>
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-5xl font-bold">${totalBalance}</h1>
            {isUsingCachedBalance && (
              <div className="flex items-center">
                <span className="text-xs text-amber-300 mr-2">
                  (using cached data)
                </span>
                <button
                  onClick={refreshUsdcBalance}
                  className="text-amber-300 hover:text-amber-200"
                  title="Refresh balance"
                >
                  <FaSync className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>

          <h2 className="text-2xl font-bold mt-8 mb-4">My assets</h2>

          {isLoadingAssets ? (
            <div className="flex justify-center py-4">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-purple-500"></div>
            </div>
          ) : assets.length > 0 ? (
            <div className="space-y-4">
              {assets.map((asset, index) => (
                <div
                  key={index}
                  className="bg-[#1C1B1F] rounded-xl p-4 flex items-center justify-between"
                >
                  <div className="flex items-center">
                    <div
                      className={`w-12 h-12 rounded-full flex items-center justify-center ${
                        asset.type === "native"
                          ? "bg-purple-600"
                          : asset.type === "token"
                          ? "bg-blue-500"
                          : "bg-purple-500"
                      }`}
                    >
                      {asset.type === "native" && (
                        <div className="w-6 h-6 bg-white rounded-md flex items-center justify-center">
                          <div className="w-4 h-4 bg-purple-600 rounded-sm"></div>
                        </div>
                      )}
                      {asset.type === "token" && (
                        <div className="text-2xl font-bold text-white">$</div>
                      )}
                      {asset.type === "pool" && (
                        <div className="text-xl font-bold text-white">⚒️</div>
                      )}
                    </div>
                    <div className="ml-3">
                      <div className="flex items-center">
                        <h3 className="font-semibold">{asset.name}</h3>
                        {asset.status && (
                          <span className="ml-2 text-sm text-gray-400">
                            • {asset.status}
                          </span>
                        )}
                        {asset.isUsingCache && (
                          <span className="ml-2 text-xs text-amber-300">
                            (cached)
                          </span>
                        )}
                      </div>
                      <p className="text-gray-400">
                        {asset.balance} {asset.symbol}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold">${asset.value.toFixed(2)}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-4 text-gray-400">
              No assets found. Get some testnet tokens to get started!
            </div>
          )}
        </div>
      )}

      {/* Heading for Hosted Pools */}
      <div className="px-4 py-4 border-b border-gray-800">
        <h2 className="text-xl font-bold">
          {isOwnProfile ? "My Hosted Pools" : `${displayName}'s Hosted Pools`}
        </h2>
      </div>

      {/* Pool List */}
      <div className="flex-1 p-4 pb-32">
        {isUserPoolsLoading ? (
          <div className="flex justify-center py-8">
            <div
              className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2"
              style={{ borderColor: "#836EF9" }}
            ></div>
          </div>
        ) : userPoolsError ? (
          <div className="text-center py-8 text-red-400">
            <p>Error loading pools. Please try again.</p>
            {isRpcError && (
              <p className="text-sm mt-1">
                There was an issue connecting to the blockchain. Using cached
                data if available.
              </p>
            )}
            <button
              onClick={() => refreshUserPools()}
              className="mt-4 hover:bg-opacity-80 px-4 py-2 rounded-lg transition-colors"
              style={{ backgroundColor: "#836EF9" }}
            >
              Retry
            </button>
          </div>
        ) : userHostedPools.length > 0 ? (
          <div className="space-y-4">
            {isUsingCache && (
              <div className="text-center py-2 text-amber-400 text-sm">
                Using cached data.{" "}
                <button onClick={refreshUserPools} className="underline">
                  Refresh
                </button>
              </div>
            )}
            {userHostedPools.map((pool) => (
              <div
                key={pool.id}
                className="bg-gray-800 rounded-lg overflow-hidden cursor-pointer hover:bg-gray-700 transition-colors p-4"
                onClick={() => router.push(`/pools/${pool.id}`)}
              >
                <div className="flex items-center">
                  <div
                    className="w-12 h-12 rounded-full flex-shrink-0 flex items-center justify-center"
                    style={{ backgroundColor: "#836EF9" }}
                  >
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
                      <span className={`text-gray-400 flex items-center`}>
                        <span
                          className={`inline-block w-2 h-2 rounded-full mr-1 ${
                            getPoolStatus(pool.ends_at) === "Trading"
                              ? "bg-[#836EF9]" // Purple dot for Trading
                              : "bg-green-400" // Green dot for Raising
                          }`}
                        ></span>
                        {getPoolStatus(pool.ends_at)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-400">
            {isOwnProfile
              ? "You haven't created any pools yet."
              : `${displayName} hasn't created any pools yet.`}
          </div>
        )}
      </div>

      {/* Add BottomNavbar at the end of the component */}
      <BottomNavbar activeTab="portfolio" />
    </div>
  );
}
