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
  FaCheck,
} from "react-icons/fa";
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
import GetTokensModal from "../../components/GetTokensModal";
import InfoModal from "../../components/InfoModal";
import SendAssetModal from "../../components/SendAssetModal";
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
import BalanceSection from "./BalanceSection";

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
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<"hosted" | "funded">("hosted");
  const { smartWalletAddress } = useSmartWallet();

  // Avatar upload state
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [showGetTokensModal, setShowGetTokensModal] = useState(false);
  const [showInfoModal, setShowInfoModal] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  // Get user assets
  const {
    assets,
    totalBalance,
    isLoading: isUserAssetsLoading,
    refreshUsdcBalance,
  } = useUserAssets();

  // Withdraw state
  const [showSendModal, setShowSendModal] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<{
    name: string;
    symbol: string;
    balance: string;
  } | null>(null);

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

  // Show loading state when fetching profile user
  if (
    isLoadingProfileUser ||
    (profileUser === null && (profileUserId || profileUsername))
  ) {
    return (
      <>
        <AppHeader
          showBackButton={true}
          showTitle={false}
          backgroundColor="#15161a"
          showGetTokensButton={false}
          showCreateButton={true}
          showPointsButton={true}
          onBackClick={() => router.back()}
        />
        <div className="flex items-center justify-center h-[80vh] bg-[#121212]">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
        </div>
      </>
    );
  }

  // Make sure we have profile data
  if (!profileUser) {
    return (
      <>
        <AppHeader
          showBackButton={true}
          showTitle={false}
          backgroundColor="#15161a"
          showGetTokensButton={false}
          showCreateButton={true}
          showPointsButton={true}
          onBackClick={() => router.back()}
        />
        <div className="flex items-center justify-center h-[80vh] bg-[#121212] flex-col">
          <div className="text-white mb-4">Profile not found</div>
          <button
            onClick={() => router.back()}
            className="px-4 py-2 bg-[#FFFFFF14] hover:bg-[#FFFFFF1A] rounded-lg text-white transition-colors"
          >
            Go back
          </button>
        </div>
      </>
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

  // Handle points button click
  const handlePointsClick = () => {
    router.push("/onboarding");
  };

  const handleSendClick = (asset: any, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent click event from bubbling up
    setSelectedAsset({
      name: asset.name,
      symbol: asset.symbol,
      balance: asset.balance,
    });
    setShowSendModal(true);
  };

  return (
    <>
      <AppHeader
        showBackButton={true}
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

              {isUploading && (
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
            <div className="flex items-center mt-1 mb-3">
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

          {/* Smart Wallet Address - only show if available */}
          {user?.smart_wallet_address && (
            <div className="mt-2 mb-3 flex justify-center">
              <div className="flex items-center px-4 py-2 bg-[#FFFFFF0A] rounded-lg">
                <span className="text-gray-500 text-sm mr-2">Account</span>
                <span className="text-gray-300 text-sm">
                  {user.smart_wallet_address &&
                    `${user.smart_wallet_address.substring(
                      0,
                      6
                    )}...${user.smart_wallet_address.substring(
                      user.smart_wallet_address.length - 4
                    )}`}
                </span>
                <button
                  onClick={() => {
                    if (user.smart_wallet_address) {
                      navigator.clipboard.writeText(user.smart_wallet_address);
                      setCopied(true);
                      setTimeout(() => setCopied(false), 2000);
                    }
                  }}
                  className="ml-2 p-1 w-6 h-6 flex items-center justify-center"
                >
                  {copied ? (
                    <FaCheck className="text-[#9EEB00] text-sm" />
                  ) : (
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                      className="text-gray-400"
                    >
                      <rect
                        x="9"
                        y="9"
                        width="13"
                        height="13"
                        rx="2"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <path
                        d="M5 15H4C2.89543 15 2 14.1046 2 13V4C2 2.89543 2.89543 2 4 2H13C14.1046 2 15 2.89543 15 4V5"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Show account setup in progress if we don't have a smart wallet */}
          {isOwnProfile && !user?.smart_wallet_address && (
            <AccountSetupBadge
              privyUser={privyUser}
              onSmartWalletReady={refreshUser}
            />
          )}

          {/* Always show logout button for own profile, and full wallet actions if they have a smart wallet address */}
          {isOwnProfile && (
            <>
              {/* Wallet Action Buttons */}
              <div className="mt-4 flex items-center space-x-8 justify-center">
                {smartWalletAddress && (
                  <>
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
                  </>
                )}

                {/* Sign Out Button - Always visible for own profile */}
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
          <BalanceSection
            totalBalance={totalBalance}
            assets={assets}
            onSendClick={handleSendClick}
            walletAddress={user.smart_wallet_address || null}
            useZerionAPI={true}
            chainId="monad-test-v2"
          />
        )}

        {/* Pool Tabs - Only show if user has a smart wallet */}
        {user.smart_wallet_address ? (
          <>
            <TabComponent
              tabs={[
                { id: "hosted", label: "Hosted" },
                { id: "funded", label: "Funded" },
              ]}
              activeTab={activeTab}
              onTabChange={(tabId) =>
                setActiveTab(tabId as "hosted" | "funded")
              }
            />

            {/* Pool List */}
            <div className="flex-1 p-4 pb-32">
              {activeTab === "hosted" ? (
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
              ) : (
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
                />
              )}
            </div>
          </>
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

      {/* Send Asset Modal */}
      <SendAssetModal
        isOpen={showSendModal}
        onClose={() => setShowSendModal(false)}
        asset={selectedAsset}
        onSuccess={() => refreshUsdcBalance()}
      />
    </>
  );
}
