"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import { usePrivy, useFundWallet } from "@privy-io/react-auth";
import {
  FaArrowLeft,
  FaEdit,
  FaTwitter,
  FaSignOutAlt,
  FaKey,
  FaDollarSign,
  FaUsers,
} from "react-icons/fa";
import { IoFlash } from "react-icons/io5";
import Image from "next/image";
import { useSupabase } from "../../../contexts/SupabaseContext";
import { User } from "../../../lib/supabase";
import { getUserById } from "../../../lib/services/user-service";
import { useUserAssets } from "../../../hooks/useUserAssets";
import AppHeader from "../../components/AppHeader";
import { useUserHostedPools } from "../../../hooks/useUserHostedPools";
import GetTokensModal from "../../components/GetTokensModal";
import InfoModal from "../../components/InfoModal";
import { PoolStatus, getDisplayStatus } from "../../../lib/contracts/types";
import { useSmartWallet } from "../../../hooks/useSmartWallet";
import UserAvatar from "../../components/UserAvatar";
import showToast from "@/utils/toast";

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
  const { smartWalletAddress } = useSmartWallet();

  // Avatar upload state
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [showGetTokensModal, setShowGetTokensModal] = useState(false);
  const [showInfoModal, setShowInfoModal] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Get the user ID from the URL if present
  const profileUserId = params?.id as string;

  // Determine if the user is viewing their own profile
  const isOwnProfile =
    !profileUserId || (dbUser && profileUserId === dbUser.id);

  // Get the user to display (either the current user or the profile being viewed)
  const [profileUser, setProfileUser] = useState<User | null>(null);
  const [isLoadingProfileUser, setIsLoadingProfileUser] = useState(false);

  // Use our new hook to fetch user hosted pools - pass the user ID directly
  const userId = profileUser?.id || dbUser?.id;
  const {
    pools: userHostedPools,
    isLoading: userPoolsLoading,
    error: userPoolsError,
    refresh: refreshUserPools,
    isUsingCache,
  } = useUserHostedPools(userId);

  // Get user assets
  const {
    assets,
    totalBalance,
    isLoading: isUserAssetsLoading,
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
        showToast.error("Please select an image file");
        return;
      }

      // Validate file size (50MB limit)
      if (file.size > 50 * 1024 * 1024) {
        showToast.error("Image size should be less than 50MB");
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
      showToast.error("You must be logged in to upload an avatar");
      return;
    }

    const loadingToast = showToast.loading("Uploading avatar...");

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
        showToast.loading("Processing image...", { id: loadingToast });

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
        showToast.success("Avatar updated successfully!", { id: loadingToast });
        return;
      } catch (fetchError) {
        console.error("Direct fetch upload failed:", fetchError);
        // Continue to try other methods
      }

      // Try to upload with the authenticated client
      try {
        console.log("Trying Supabase client upload...");
        showToast.loading("Processing image...", { id: loadingToast });

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
        showToast.success("Avatar updated successfully!", { id: loadingToast });
      } catch (supabaseError) {
        console.error("Supabase client upload error:", supabaseError);
        showToast.error("Failed to upload avatar. Please try again.", {
          id: loadingToast,
        });
      }
    } catch (error) {
      console.error("Error uploading avatar:", error);
      showToast.error("Failed to upload avatar. Please try again.", {
        id: loadingToast,
      });
    } finally {
      setIsUploadingImage(false);
      // Don't reset the image preview so the user can see the uploaded image
      // setSelectedImage(null);
      // setImagePreview(null);
    }
  };

  // Function to handle export wallet - fix to export the embedded wallet
  const handleExportWallet = () => {
    // For smart wallets, you need to export the embedded wallet that controls it
    if (privyUser?.wallet?.address) {
      // Export the embedded wallet that acts as the signer for the smart wallet
      exportWallet({ address: privyUser.wallet.address });
    } else {
      console.error("No embedded wallet available to export");
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

  // Function to determine pool status
  const getPoolStatus = (pool: any) => {
    const displayStatus = getDisplayStatus(
      pool.status,
      pool.ends_at,
      pool.raised_amount,
      pool.target_amount
    );

    switch (displayStatus) {
      case "FUNDED":
      case "FULLY_FUNDED":
        return { text: "Funded", colorClass: "bg-[#836EF9]" }; // Purple dot for Funded
      case "EXECUTING":
        return { text: "Production", colorClass: "bg-[#22C55E]" }; // Green dot for Executing
      case "FAILED":
        return { text: "Unfunded", colorClass: "bg-[#F87171]" }; // Red dot for Unfunded
      case "ACTIVE":
        return { text: "Raising", colorClass: "bg-[#00C48C]" }; // Green dot for Active
      case "PAUSED":
        return { text: "Paused", colorClass: "bg-[#F59E0B]" }; // Yellow dot for Paused
      default:
        console.log(
          `Pool ${pool.id} has unrecognized status: ${displayStatus}`
        );
        return { text: "Inactive", colorClass: "bg-gray-400" }; // Gray dot for other states
    }
  };

  // Handle points button click
  const handlePointsClick = () => {
    router.push("/onboarding");
  };

  return (
    <>
      <AppHeader
        showBackButton={false}
        showTitle={false}
        backgroundColor="#15161a"
        showGetTokensButton={true}
        showCreateButton={true}
        showPointsButton={true}
        onGetTokensClick={() => setShowGetTokensModal(true)}
        onInfoClick={() => setShowInfoModal(true)}
        onPointsClick={handlePointsClick}
      />

      {/* Main Content */}
      <div className="px-4 pb-24 md:pb-8">
        {/* Back button if needed */}
        {!isOwnProfile && (
          <div className="py-2">
            <button
              onClick={() => router.back()}
              className="w-12 h-12 bg-[#FFFFFF14] rounded-full flex items-center justify-center text-white hover:bg-[#FFFFFF1A] transition-colors"
            >
              <FaArrowLeft />
            </button>
          </div>
        )}

        {/* Profile Header with Avatar and Name */}
        <div className="relative pt-12 pb-8 flex flex-col items-center bg-gradient-to-b from-[#1A0B3E] to-[#4A2A9A]">
          {/* Avatar with Edit Button */}
          <div className="relative mb-4">
            <div className="w-28 h-28 overflow-hidden">
              {imagePreview ? (
                <Image
                  src={imagePreview}
                  alt="Profile Preview"
                  width={112}
                  height={112}
                  className="object-cover w-full h-full rounded-full"
                  unoptimized={true}
                />
              ) : (
                <UserAvatar user={user} size={112} />
              )}

              {isUploadingImage && (
                <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center rounded-full">
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
            <div className="flex items-center mt-1">
              <a
                href={`https://x.com/${user.twitter_username}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center text-gray-300 hover:text-purple-400 transition-colors"
              >
                <FaTwitter className="mr-2" />
                <span>@{user.twitter_username}</span>
              </a>
            </div>
          )}

          {/* Only show Wallet Action Buttons if viewing own profile */}
          {isOwnProfile && smartWalletAddress && (
            <>
              {/* Wallet Action Buttons */}
              <div className="mt-4 flex items-center space-x-8 justify-center">
                {/* Receive Funds Button - use smartWalletAddress instead of walletAddress */}
                <button
                  onClick={() => {
                    if (smartWalletAddress) {
                      fundWallet(smartWalletAddress, {
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

                {/* Export Keys Button - use smart wallet */}
                <button
                  onClick={handleExportWallet}
                  className="flex flex-col items-center"
                  aria-label="Export Keys"
                >
                  <div className="w-12 h-12 flex items-center justify-center bg-gray-800 hover:bg-gray-700 rounded-full text-white transition-colors mb-1">
                    <FaKey className="text-xl" />
                  </div>
                  <span className="text-xs text-gray-400">Export Keys</span>
                </button>

                {/* Sign Out Button */}
                <button
                  onClick={logout}
                  className="flex flex-col items-center"
                  aria-label="Sign Out"
                >
                  <div className="w-12 h-12 flex items-center justify-center bg-gray-800 hover:bg-gray-700 rounded-full text-white transition-colors mb-1">
                    <FaSignOutAlt className="text-xl" />
                  </div>
                  <span className="text-xs text-gray-400">Sign Out</span>
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
            </div>

            <h2 className="text-2xl font-bold mt-8 mb-4">My assets</h2>
            {assets.length > 0 ? (
              <div className="space-y-4">
                {assets.map((asset, index) => (
                  <div
                    key={index}
                    className="flex justify-between items-center py-4 px-4 bg-[#1D1C2A] rounded-lg"
                  >
                    <div className="flex items-center">
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          asset.type === "token"
                            ? "bg-blue-800"
                            : asset.type === "pool"
                            ? "bg-purple-800"
                            : "bg-green-800"
                        }`}
                      >
                        {asset.type === "token" ? (
                          <FaDollarSign className="text-white" />
                        ) : asset.type === "pool" ? (
                          <FaUsers className="text-white" />
                        ) : (
                          <IoFlash className="text-white" />
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
                No assets found. Add USDC to your smart wallet to get started!
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
          {userPoolsLoading ? (
            <div className="flex justify-center py-8">
              <div
                className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2"
                style={{ borderColor: "#836EF9" }}
              ></div>
            </div>
          ) : userPoolsError ? (
            <div className="text-center py-8 text-red-400">
              <p>Error loading pools. Please try again.</p>
              {isUsingCache && (
                <p className="text-sm mt-1">
                  There was an issue connecting to the blockchain. Using cached
                  data if available.
                </p>
              )}
            </div>
          ) : userHostedPools.length > 0 ? (
            <div className="space-y-4">
              {userHostedPools.map((pool) => (
                <div
                  key={pool.id}
                  className="bg-[#1C1B1F] rounded-xl overflow-hidden cursor-pointer hover:bg-[#28262C] transition-colors p-4"
                  onClick={() => router.push(`/pools/${pool.id}`)}
                >
                  <div className="flex items-center">
                    <div
                      className="w-12 h-12 rounded-full overflow-hidden flex-shrink-0 flex items-center justify-center"
                      style={{ backgroundColor: "#2A2640" }}
                    >
                      {pool.image_url ? (
                        <Image
                          src={pool.image_url}
                          alt={pool.name}
                          width={48}
                          height={48}
                          className="w-full h-full object-cover"
                          unoptimized={true}
                        />
                      ) : null}
                    </div>
                    <div className="ml-4 flex-1">
                      <h3 className="font-bold">{pool.name}</h3>
                      <div className="flex items-center text-sm">
                        <span className={`text-gray-400 flex items-center`}>
                          <span
                            className={`inline-block w-2 h-2 rounded-full mr-1 ${
                              getPoolStatus(pool).colorClass
                            }`}
                          ></span>
                          {getPoolStatus(pool).text}
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
      </div>

      {/* Modals */}
      {showGetTokensModal && (
        <GetTokensModal
          isOpen={showGetTokensModal}
          onClose={() => setShowGetTokensModal(false)}
        />
      )}

      {/* Info Modal */}
      <InfoModal
        isOpen={showInfoModal}
        onClose={() => setShowInfoModal(false)}
      />
    </>
  );
}
