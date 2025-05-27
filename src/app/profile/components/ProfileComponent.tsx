"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import { usePrivy, useFundWallet } from "@privy-io/react-auth";
import {
  FaArrowLeft,
  FaEdit,
  FaSignOutAlt,
  FaKey,
  FaDollarSign,
  FaUsers,
  FaCheck,
} from "react-icons/fa";
import { FaXTwitter } from "react-icons/fa6";
import { IoFlash } from "react-icons/io5";
import Image from "next/image";
import { useSupabase } from "../../../contexts/SupabaseContext";
import { User } from "../../../lib/supabase";
import {
  getUserById,
  getUserByUsername,
} from "../../../lib/services/user-service";
import { useUserAssets } from "../../../hooks/useUserAssets";
import AppHeader from "../../components/AppHeader";
import { useUserHostedPools } from "../../../hooks/useUserHostedPools";
import { useUserFundedPools } from "../../../hooks/useUserFundedPools";
import { useWalletAssets } from "../../../hooks/useWalletAssets";
import GetTokensModal from "../../components/GetTokensModal";
import InfoModal from "../../components/InfoModal";
import SendAssetModal from "../../components/SendAssetModal";
import SendNFTModal from "../../components/SendNFTModal";
import { getDisplayStatus } from "../../../lib/contracts/types";
import { useSmartWallet } from "../../../hooks/useSmartWallet";
import UserAvatar from "../../components/UserAvatar";
import showToast from "@/utils/toast";
import TabComponent from "./TabComponent";
import PoolList from "./PoolList";
import AccountSetupMessage from "./AccountSetupMessage";
import AccountSetupBadge from "./AccountSetupBadge";
import { useSmartWalletInitializer } from "../../../hooks/useSmartWalletInitializer";
import { useAvatarUpload } from "../../../hooks/useAvatarUpload";
import { mutate } from "swr";
import BalanceSection from "./BalanceSection";
import { useWalletNFTs } from "../../../hooks/useWalletNFTs";
import NFTList from "./NFTList";
import ProfileSkeleton from "./ProfileSkeleton";
import NFTSkeleton from "./NFTSkeleton";
import SettingsButton from "./SettingsButton";
import { CONTRACT_ADDRESSES } from "@/lib/contracts/addresses";
import CopyButton from "../../components/CopyButton";

interface ProfileComponentProps {
  isUsernameRoute?: boolean;
}

export default function ProfileComponent({
  isUsernameRoute = false,
}: ProfileComponentProps) {
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
  const [activeTab, setActiveTab] = useState<
    "assets" | "nfts" | "passes" | "hosted" | "funded"
  >("assets");
  const { smartWalletAddress } = useSmartWallet();

  // Avatar upload state
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [showGetTokensModal, setShowGetTokensModal] = useState(false);
  const [showInfoModal, setShowInfoModal] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Add missing state for send modal and selected asset
  const [showSendModal, setShowSendModal] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<any>(null);

  // Add state for NFT send modal
  const [showSendNFTModal, setShowSendNFTModal] = useState(false);
  const [selectedNFT, setSelectedNFT] = useState<any>(null);

  // Use our custom hook for avatar uploads
  const { isUploading, uploadAvatar } = useAvatarUpload(
    dbUser,
    privyUser,
    refreshUser
  );

  // Get the user identifier from the URL
  const profileUserId = isUsernameRoute ? null : (params?.id as string);
  const profileUsername = isUsernameRoute ? (params?.username as string) : null;

  // Determine if the user is viewing their own profile
  const isOwnProfile =
    (!profileUserId && !profileUsername) ||
    (dbUser &&
      ((profileUserId && profileUserId === dbUser.id) ||
        (profileUsername &&
          profileUsername.toLowerCase() === dbUser.username?.toLowerCase())));

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
    isUsingCache: isHostedUsingCache,
  } = useUserHostedPools(userId);

  // For funded pools, we need the user's wallet address
  const userWalletAddress =
    profileUser?.smart_wallet_address || dbUser?.smart_wallet_address;
  const {
    pools: userFundedPools,
    isLoading: fundedPoolsLoading,
    error: fundedPoolsError,
    refresh: refreshFundedPools,
  } = useUserFundedPools(userWalletAddress);

  // Get wallet assets for LP token detection (for unfunded pools)
  const { assets: walletAssets } = useWalletAssets(
    userWalletAddress || null,
    "monad-test-v2"
  );

  // Get user wallet balance directly
  const { totalValue, isLoading: balanceIsLoading } = useWalletAssets(
    userWalletAddress || null,
    "monad-test-v2"
  );

  // Format currency for display
  const formatCurrency = (value: number | null): string => {
    if (value === null) return "$0.00";
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  // Set the correct viewport height, accounting for mobile browsers
  useEffect(() => {
    const updateHeight = () => {
      setViewportHeight(`${window.innerHeight}px`);
    };

    updateHeight();
    window.addEventListener("resize", updateHeight);
    return () => window.removeEventListener("resize", updateHeight);
  }, []);

  // Initialize smart wallet if needed using our custom hook
  useSmartWalletInitializer({
    isOwnProfile: Boolean(isOwnProfile),
    privyUser,
    dbUser,
    smartWalletAddress,
    refreshUser,
    authenticated,
    ready,
  });

  // Reset profile data when URL parameters change to prevent showing cached data
  useEffect(() => {
    // Clear profile user data when URL parameters change
    setProfileUser(null);
  }, [profileUserId, profileUsername, isUsernameRoute]);

  // Fetch profile user data if viewing someone else's profile
  useEffect(() => {
    async function fetchProfileUser() {
      // Always start with loading state when fetching profile
      setIsLoadingProfileUser(true);

      try {
        // Case 1: No ID or username in URL - viewing own profile
        if (!profileUserId && !profileUsername) {
          console.log("No profile identifier, using current user");
          setProfileUser(dbUser);
          setIsLoadingProfileUser(false);
          return;
        }

        // Case 2: ID or username matches current user - viewing own profile
        if (
          dbUser &&
          ((profileUserId && profileUserId === dbUser.id) ||
            (profileUsername &&
              profileUsername.toLowerCase() === dbUser.username?.toLowerCase()))
        ) {
          console.log(
            "Profile identifier matches current user, using current user"
          );
          setProfileUser(dbUser);
          setIsLoadingProfileUser(false);
          return;
        }

        // Case 3: Viewing someone else's profile - must fetch from database
        let user = null;

        if (isUsernameRoute && profileUsername) {
          console.log("Fetching profile for username:", profileUsername);
          user = await getUserByUsername(profileUsername);
        } else if (profileUserId) {
          console.log("Fetching profile for user ID:", profileUserId);
          user = await getUserById(profileUserId);
        }

        console.log("Fetched profile user:", user);

        if (!user) {
          console.error(
            "User not found with identifier:",
            isUsernameRoute ? profileUsername : profileUserId
          );
          // Redirect to 404 or home page if user not found
          router.push("/");
          return;
        }

        // Important: Set the profile user data with what we fetched
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
  }, [profileUserId, profileUsername, isUsernameRoute, dbUser, ready, router]);

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
    return <ProfileSkeleton />;
  }

  if (!authenticated || !dbUser) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#121212] flex-col">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500 mb-4"></div>
        <p className="text-white">Please log in to view profiles</p>
      </div>
    );
  }

  // Show loading state when fetching profile user
  if (
    isLoadingProfileUser ||
    (profileUser === null && (profileUserId || profileUsername))
  ) {
    return <ProfileSkeleton />;
  }

  // Make sure we have profile data
  if (!profileUser) {
    return (
      <div className="flex items-center justify-center h-[80vh] bg-[#121212] flex-col">
        <div className="text-white mb-4">Profile not found</div>
        <button
          onClick={() => router.back()}
          className="px-4 py-2 bg-[#FFFFFF14] hover:bg-[#FFFFFF1A] rounded-lg text-white transition-colors"
        >
          Go back
        </button>
      </div>
    );
  }

  // Use the appropriate user data for display
  const user = profileUser;
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

      // Upload the image immediately using our custom hook
      uploadAvatar(file).then((url) => {
        if (url) {
          setImagePreview(url);
        }
      });
    }
  };

  // Handle image removal
  const handleRemoveImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
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

  const handleSendClick = (asset: any, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent click event from bubbling up

    // Convert the balance to a string to ensure it's properly passed to the SendAssetModal
    const balance = asset.attributes?.quantity?.float || 0;
    const balanceString = balance.toString();

    // Check if this is a native MON token (if isNative was set by BalanceSection)
    const isNative =
      asset.isNative ||
      (asset.attributes?.fungible_info?.symbol === "MON" &&
        (!asset.attributes?.fungible_info?.implementations?.[0]?.address ||
          asset.attributes?.fungible_info?.implementations?.[0]?.address ===
            null));

    // Get token decimals from the asset
    const decimals =
      asset.decimals || asset.attributes?.fungible_info?.decimals || 18;

    setSelectedAsset({
      name: asset.attributes?.fungible_info?.name || asset.name || "Unknown",
      symbol:
        asset.attributes?.fungible_info?.symbol || asset.symbol || "UNKNOWN",
      balance: balanceString,
      address:
        asset.attributes?.fungible_info?.implementations?.[0]?.address ||
        asset.address,
      isNative: isNative, // Pass the isNative flag to the SendAssetModal
      decimals: decimals, // Pass the decimals to the SendAssetModal
    });
    setShowSendModal(true);
  };

  const handleSendNFTClick = (nft: any, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent click event from bubbling up

    console.log("Send NFT clicked:", nft);
    setSelectedNFT(nft);
    setShowSendNFTModal(true);
  };

  // Handle asset swap click - navigate to swap interface with token parameters
  const handleSwapClick = (asset: any, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent click event from bubbling up

    // Get the token information
    const symbol =
      asset.attributes?.fungible_info?.symbol || asset.symbol || "UNKNOWN";
    const address =
      asset.attributes?.fungible_info?.implementations?.[0]?.address ||
      asset.address;

    // Check if this is a native MON token
    const isNative =
      asset.isNative ||
      (asset.attributes?.fungible_info?.symbol === "MON" &&
        (!asset.attributes?.fungible_info?.implementations?.[0]?.address ||
          asset.attributes?.fungible_info?.implementations?.[0]?.address ===
            null));

    // Special direct URL for WMON to MON swaps
    if (
      symbol === "WMON" ||
      address?.toLowerCase() ===
        CONTRACT_ADDRESSES.monadTestnet.officialWmon.toLowerCase()
    ) {
      // For WMON, hardcode the exact URL parameters for WMON → MON
      router.push(
        `/swap?inputToken=${CONTRACT_ADDRESSES.monadTestnet.officialWmon}&outputToken=NATIVE`
      );
      return;
    }

    // Normal handling for other tokens
    // Determine which tokens to use for the swap
    let inputToken = "";
    let outputToken = "";

    // Use "NATIVE" for native MON, otherwise use the token address
    const tokenAddress = isNative ? "NATIVE" : address;

    // If USDC, set up swap between USDC and MON
    if (
      symbol === "USDC" ||
      address?.toLowerCase() ===
        CONTRACT_ADDRESSES.monadTestnet.usdc.toLowerCase()
    ) {
      inputToken = tokenAddress;
      outputToken = "NATIVE"; // MON
    }
    // Otherwise, set up swap between the token and USDC
    else {
      inputToken = tokenAddress;
      outputToken = CONTRACT_ADDRESSES.monadTestnet.usdc;
    }

    // Create query string parameters
    const params = new URLSearchParams({
      inputToken,
      outputToken,
    }).toString();

    // Navigate to the swap page with the parameters
    router.push(`/swap?${params}`);
  };

  return (
    <>
      {/* Main Content */}
      <div className="px-4 pb-24 md:pb-8">
        {/* Profile Header - Super compact layout */}
        <div className="relative py-6 px-4 bg-gradient-to-b from-[#1A0B3E] to-[#4A2A9A] rounded-xl">
          <div className="container mx-auto">
            {/* Top Row: Avatar, User Info and Balance */}
            <div className="flex flex-col md:flex-row items-center md:items-center gap-4 md:gap-6">
              {/* Profile Avatar */}
              <div className="relative">
                <div className="w-24 h-24 md:w-20 md:h-20 overflow-hidden rounded-full">
                  {imagePreview ? (
                    <Image
                      src={imagePreview}
                      alt="Profile Preview"
                      width={112}
                      height={112}
                      className="object-cover w-full h-full"
                      unoptimized={true}
                    />
                  ) : (
                    <UserAvatar user={user} size={80} />
                  )}

                  {isUploading && (
                    <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center rounded-full">
                      <div className="animate-spin rounded-full h-7 w-7 border-t-2 border-b-2 border-white"></div>
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
                      className="absolute bottom-0 right-0 w-7 h-7 bg-[#2A2640] hover:bg-[#3A3650] rounded-full flex items-center justify-center"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <FaEdit className="text-white text-sm" />
                    </button>
                  </>
                )}
              </div>

              {/* User Info */}
              <div className="flex flex-col items-center md:items-start flex-grow">
                <h1 className="text-2xl md:text-3xl font-bold">
                  {displayName}
                </h1>

                {/* Twitter handle if available */}
                {user?.twitter_username && (
                  <div className="flex items-center mt-1">
                    <a
                      href={`https://x.com/${user.twitter_username}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center text-gray-300 hover:text-[#836EF9] transition-colors"
                    >
                      <FaXTwitter className="mr-2 text-[#836EF9]" />
                      <span>@{user.twitter_username}</span>
                    </a>
                  </div>
                )}

                {/* Smart Wallet Address - only show if available */}
                {user?.smart_wallet_address && (
                  <div className="flex items-center mt-2 bg-[#2A2640] px-3 py-1.5 rounded-lg">
                    <span className="text-gray-300 text-sm mr-2">Account</span>
                    <span className="text-white text-sm">
                      {user.smart_wallet_address &&
                        `${user.smart_wallet_address.substring(
                          0,
                          6
                        )}...${user.smart_wallet_address.substring(
                          user.smart_wallet_address.length - 4
                        )}`}
                    </span>
                    <CopyButton
                      textToCopy={user.smart_wallet_address}
                      className="ml-2"
                    />
                  </div>
                )}
              </div>

              {/* Right Column: Balance and Action Buttons */}
              <div className="flex flex-col items-center md:items-end mt-4 md:mt-0">
                {/* Show account setup in progress if we don't have a smart wallet */}
                {isOwnProfile && !user?.smart_wallet_address && (
                  <AccountSetupBadge
                    privyUser={privyUser}
                    onSmartWalletReady={refreshUser}
                  />
                )}

                {/* Balance Information - Displayed when wallet is available */}
                {user?.smart_wallet_address && (
                  <>
                    <div className="flex flex-col items-center md:items-end">
                      <div className="text-gray-400 text-sm">Balance</div>
                      {balanceIsLoading ? (
                        <div className="mt-1 h-7 flex items-center">
                          <div className="w-4 h-4 border-t-2 border-b-2 border-[#836EF9] animate-spin rounded-full mr-2"></div>
                          <span>Loading...</span>
                        </div>
                      ) : (
                        <div className="text-2xl md:text-3xl font-bold">
                          {formatCurrency(totalValue)}
                        </div>
                      )}
                    </div>

                    {/* Action Buttons moved under balance - only for own profile */}
                    {isOwnProfile && (
                      <div className="flex items-center space-x-4 mt-4">
                        {/* Receive Funds Button */}
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
                          <div className="w-10 h-10 flex items-center justify-center bg-[#2A2640] hover:bg-[#3A3650] rounded-full text-white transition-colors mb-1">
                            <svg
                              width="20"
                              height="20"
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
                          <div className="w-10 h-10 flex items-center justify-center bg-[#2A2640] hover:bg-[#3A3650] rounded-full text-white transition-colors mb-1">
                            <FaKey className="text-lg" />
                          </div>
                          <span className="text-xs text-gray-400">
                            Export Keys
                          </span>
                        </button>

                        {/* Settings Button */}
                        <SettingsButton />
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Pool Tabs - Only show if user has a smart wallet */}
        {user.smart_wallet_address ? (
          <div className="mt-4">
            <TabComponent
              tabs={[
                { id: "assets", label: "Tokens" },
                { id: "nfts", label: "NFTs" },
                { id: "passes", label: "Passes" },
                { id: "hosted", label: "Hosted" },
                { id: "funded", label: "Committed" },
              ]}
              activeTab={activeTab}
              onTabChange={(tabId) =>
                setActiveTab(
                  tabId as "assets" | "nfts" | "passes" | "hosted" | "funded"
                )
              }
            />

            {/* Tab Content */}
            <div className="pb-32">
              {activeTab === "assets" ? (
                <BalanceSection
                  onSendClick={handleSendClick}
                  onSwapClick={handleSwapClick}
                  walletAddress={user.smart_wallet_address || null}
                  chainId="monad-test-v2"
                  isOwnProfile={Boolean(isOwnProfile)}
                />
              ) : activeTab === "nfts" ? (
                // Regular NFTs tab content
                <NFTsContent
                  walletAddress={user.smart_wallet_address || null}
                  isOwnProfile={Boolean(isOwnProfile)}
                  displayName={displayName}
                  onSendNFTClick={handleSendNFTClick}
                />
              ) : activeTab === "passes" ? (
                // Passes (StageDotFun NFTs) tab content
                <PassesContent
                  walletAddress={user.smart_wallet_address || null}
                  isOwnProfile={Boolean(isOwnProfile)}
                  displayName={displayName}
                  onSendNFTClick={handleSendNFTClick}
                />
              ) : activeTab === "hosted" ? (
                <PoolList
                  pools={userHostedPools}
                  isLoading={userPoolsLoading}
                  error={userPoolsError}
                  isUsingCache={isHostedUsingCache}
                  emptyMessage={
                    isOwnProfile
                      ? "You haven't created any pools yet."
                      : `${displayName} hasn't created any pools yet.`
                  }
                  getPoolStatus={getPoolStatus}
                  isOwnProfile={Boolean(isOwnProfile)}
                  profileName={displayName}
                />
              ) : activeTab === "funded" ? (
                <PoolList
                  pools={userFundedPools}
                  isLoading={fundedPoolsLoading}
                  error={fundedPoolsError}
                  emptyMessage={
                    isOwnProfile
                      ? "You haven't funded any pools yet."
                      : `${displayName} hasn't funded any pools yet.`
                  }
                  getPoolStatus={getPoolStatus}
                  isOwnProfile={Boolean(isOwnProfile)}
                  profileName={displayName}
                  userAssets={isOwnProfile ? walletAssets : []}
                  onRefresh={() => {
                    refreshFundedPools();
                    // Also refresh wallet assets to update LP token balances
                    if (user.smart_wallet_address) {
                      mutate(
                        `wallet-assets-${user.smart_wallet_address}-monad-test-v2`
                      );
                    }
                  }}
                />
              ) : null}
            </div>
          </div>
        ) : (
          <AccountSetupMessage
            user={user}
            displayName={displayName}
            isOwnProfile={Boolean(isOwnProfile)}
            privyUser={privyUser}
            onSmartWalletReady={refreshUser}
          />
        )}
      </div>

      {/* Send Asset Modal */}
      <SendAssetModal
        isOpen={showSendModal}
        onClose={() => setShowSendModal(false)}
        asset={selectedAsset}
        onSuccess={() => {
          if (user.smart_wallet_address) {
            // Refresh the wallet assets list
            mutate(`wallet-assets-${user.smart_wallet_address}-monad-test-v2`);

            // Also refresh wallet balance in the BalanceSection
            mutate(`alchemy-tokens-${user.smart_wallet_address}-monad-test-v2`);
          }
        }}
      />

      {/* Send NFT Modal */}
      <SendNFTModal
        isOpen={showSendNFTModal}
        onClose={() => setShowSendNFTModal(false)}
        nft={selectedNFT}
        onSuccess={() => {
          if (user.smart_wallet_address) {
            // Refresh the NFTs list
            mutate(`wallet-nfts-${user.smart_wallet_address}-monad-test-v2`);
          }
        }}
      />
    </>
  );
}

// Helper function to identify StageDotFun NFTs (Passes)
function isStageDotFunNFT(nft: any): boolean {
  // Check if collection name includes "Patron" (our naming convention)
  if (nft.collectionName && nft.collectionName.includes("Patron")) {
    return true;
  }

  // Check if collection name includes "Stage"
  if (nft.collectionName && nft.collectionName.includes("Stage")) {
    return true;
  }

  // Additional check: if the NFT name suggests it's a tier/pass
  if (nft.name && (nft.name.includes("Tier") || nft.name.includes("Pass"))) {
    return true;
  }

  return false;
}

// Regular NFTs tab content component
function NFTsContent({
  walletAddress,
  isOwnProfile,
  displayName,
  onSendNFTClick,
}: {
  walletAddress: string | null;
  isOwnProfile: boolean;
  displayName: string;
  onSendNFTClick?: (nft: any, e: React.MouseEvent) => void;
}) {
  // Only fetch NFTs from Monad testnet where our contract is deployed
  const { nfts, isLoading, error } = useWalletNFTs(
    walletAddress,
    "monad-test-v2"
  );

  // Filter out StageDotFun NFTs to show only regular NFTs
  const regularNFTs = nfts.filter((nft) => !isStageDotFunNFT(nft));

  const emptyMessage = isOwnProfile
    ? "You don't have any NFTs yet."
    : `${displayName} doesn't have any NFTs yet.`;

  // Show skeleton loader when loading
  if (isLoading) {
    return <NFTSkeleton />;
  }

  return (
    <div className="mt-6">
      <NFTList
        nfts={regularNFTs}
        isLoading={false} // We're handling loading state with the skeleton above
        error={error}
        emptyMessage={emptyMessage}
        isOwnProfile={isOwnProfile}
        onSendClick={onSendNFTClick}
      />
    </div>
  );
}

// Passes tab content component (StageDotFun NFTs only)
function PassesContent({
  walletAddress,
  isOwnProfile,
  displayName,
  onSendNFTClick,
}: {
  walletAddress: string | null;
  isOwnProfile: boolean;
  displayName: string;
  onSendNFTClick?: (nft: any, e: React.MouseEvent) => void;
}) {
  // Only fetch NFTs from Monad testnet where our contract is deployed
  const { nfts, isLoading, error } = useWalletNFTs(
    walletAddress,
    "monad-test-v2"
  );

  // Filter for StageDotFun NFTs only
  const stageNFTs = nfts.filter((nft) => isStageDotFunNFT(nft));

  const emptyMessage = isOwnProfile
    ? "You don't have any passes yet."
    : `${displayName} doesn't have any passes yet.`;

  // Show skeleton loader when loading
  if (isLoading) {
    return <NFTSkeleton />;
  }

  return (
    <div className="mt-6">
      <NFTList
        nfts={stageNFTs}
        isLoading={false} // We're handling loading state with the skeleton above
        error={error}
        emptyMessage={emptyMessage}
        isOwnProfile={isOwnProfile}
        onSendClick={onSendNFTClick}
      />
    </div>
  );
}
