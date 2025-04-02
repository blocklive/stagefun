"use client";

import { usePrivy } from "@privy-io/react-auth";
import { useRouter, useParams } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import { FaArrowLeft, FaWallet } from "react-icons/fa";
import { useSupabase } from "../../../contexts/SupabaseContext";
import { useContractInteraction as useContractInteractionHook } from "../../../hooks/useContractInteraction";
import { useContractInteraction } from "../../../contexts/ContractInteractionContext";
import { useUSDCBalance } from "../../../hooks/useUSDCBalance";
import { usePoolDetails } from "../../../hooks/usePoolDetails";
import { usePoolCommitments } from "../../../hooks/usePoolCommitments";
import { usePoolTimeLeft } from "../../../hooks/usePoolTimeLeft";
import {
  usePoolTiers,
  usePoolTiersWithPatrons,
  type DBTier,
} from "../../../hooks/usePoolTiers";
import AppHeader from "../../components/AppHeader";
import { getAllTiers, Tier } from "../../../lib/contracts/StageDotFunPool";
import { useSmartWallet } from "../../../hooks/useSmartWallet";
import showToast from "@/utils/toast";

// Import components
import PoolHeader from "./components/PoolHeader";
import OpenPoolView from "./components/OpenPoolView";
import FundedPoolView from "./components/FundedPoolView";
import TokenSection from "./components/TokenSection";
import OrganizerSection from "./components/OrganizerSection";
import UserCommitment from "./components/UserCommitment";
import PatronsTab from "./components/PatronsTab";
import PoolFundsSection from "./components/PoolFundsSection";
import CommitModal from "./components/CommitModal";
import GetTokensModal from "../../components/GetTokensModal";
import PoolDescription from "./components/PoolDescription";
import UnfundedPoolView from "./components/UnfundedPoolView";
import PoolLocation from "./components/PoolLocation";
import FixedBottomBar from "./components/FixedBottomBar";
import InfoModal from "../../components/InfoModal";
import { PoolStatus, getDisplayStatus } from "../../../lib/contracts/types";
import { ethers } from "ethers";

export default function PoolDetailsPage() {
  const { user: privyUser } = usePrivy();
  const { dbUser } = useSupabase();
  const router = useRouter();
  const params = useParams();
  const poolId = params.id as string;
  const { smartWalletAddress } = useSmartWallet();

  const {
    pool,
    creator,
    patrons: poolPatrons,
    targetAmount,
    raisedAmount,
    percentage,
    targetReachedTime,
    isLoading: isLoadingPool,
    error: poolError,
    refresh: refreshPool,
  } = usePoolDetails(poolId);

  // Use both hook and context for different functionalities
  const { walletsReady, privyReady } = useContractInteractionHook();

  const {
    claimRefund,
    depositToPool,
    isLoading: isBlockchainLoading,
  } = useContractInteraction();

  const {
    balance: usdcBalance,
    refresh: refreshBalance,
    isUsingCache: isUsingCachedBalance,
  } = useUSDCBalance();

  const {
    commitments,
    loading: isCommitmentsLoading,
    error: commitmentsError,
    refresh: refreshCommitments,
  } = usePoolCommitments(pool?.contract_address || null);

  const {
    days,
    hours,
    minutes,
    seconds,
    hasEnded,
    isLoading: isTimeLoading,
  } = usePoolTimeLeft(pool);

  const {
    tiers: dbTiers,
    isLoading: isLoadingDbTiers,
    isError: dbTiersError,
  } = usePoolTiers(poolId);

  const {
    tiers: chainTiers,
    isLoading: isLoadingChainTiers,
    isError: chainTiersError,
  } = usePoolTiersWithPatrons(pool?.contract_address || null);

  // Remove the tier state logging
  const tiers = dbTiers
    ? dbTiers.map((dbTier, index) => {
        const chainTier = chainTiers?.[index];
        if (chainTier) {
          return {
            ...dbTier,
            currentPatrons: Number(chainTier.currentPatrons),
            maxPatrons: Number(chainTier.maxPatrons),
            isActive: chainTier.isActive,
            price: Number(ethers.formatUnits(chainTier.price, 6)),
            minPrice: chainTier.isVariablePrice
              ? Number(ethers.formatUnits(chainTier.minPrice, 6))
              : null,
            maxPrice: chainTier.isVariablePrice
              ? Number(ethers.formatUnits(chainTier.maxPrice, 6))
              : null,
            isVariablePrice: chainTier.isVariablePrice,
            nftMetadata: chainTier.nftMetadata,
          };
        }
        return {
          ...dbTier,
          currentPatrons: 0,
          maxPatrons: dbTier.max_supply || 0,
          isActive: dbTier.is_active,
          price: dbTier.price,
          minPrice: dbTier.min_price,
          maxPrice: dbTier.max_price,
          isVariablePrice: dbTier.is_variable_price,
          nftMetadata: "",
        };
      })
    : null;

  const isLoadingTiers = isLoadingDbTiers;
  const tiersError = dbTiersError || chainTiersError;

  // Add contract interaction
  const { isLoading: isContractLoading } = useContractInteractionHook();

  // Calculate total committed and target amount from commitments
  const totalCommitted =
    commitments?.reduce(
      (sum, commitment) => sum + (Number(commitment.amount) || 0),
      0
    ) || 0;

  // Viewport height effect
  useEffect(() => {
    const updateHeight = () => setViewportHeight(`${window.innerHeight}px`);
    updateHeight();
    window.addEventListener("resize", updateHeight);
    return () => window.removeEventListener("resize", updateHeight);
  }, []);

  // Basic states
  const [viewportHeight, setViewportHeight] = useState("100vh");
  const [activeTab, setActiveTab] = useState("commit");
  const [commitAmount, setCommitAmount] = useState("1");
  const [showPatrons, setShowPatrons] = useState(true);
  const [contentTab, setContentTab] = useState<"overview" | "patrons">(
    "overview"
  );

  // Add state for commit modal
  const [isCommitModalOpen, setIsCommitModalOpen] = useState(false);

  // Debug contentTab changes
  useEffect(() => {
    console.log("contentTab changed to:", contentTab);
  }, [contentTab]);

  // Add state for approving
  const [isCommitting, setIsCommitting] = useState(false);

  // Add state to control button visibility based on pool status
  const [showCommitButton, setShowCommitButton] = useState(false);

  // Add state for getting tokens
  const [showTokensModal, setShowTokensModal] = useState(false);

  // Add state for refunding
  const [isRefunding, setIsRefunding] = useState(false);

  // Add state for InfoModal
  const [showInfoModal, setShowInfoModal] = useState(false);

  // Handle max click
  const handleMaxClick = useCallback(() => {
    setCommitAmount(usdcBalance);
  }, [usdcBalance]);

  // Update handleCommit to use tier-based commitment
  const handleCommit = async (tierId: string, amount: string) => {
    try {
      setIsCommitting(true);
      console.log(
        `Handling commit in page: tierId=${tierId}, amount=${amount}, type=${typeof amount}`
      );

      const numericAmount = parseFloat(amount);
      console.log(
        `Parsed numeric amount: ${numericAmount}, isNaN: ${isNaN(
          numericAmount
        )}`
      );

      // Allow 0 as a valid amount, just check if it's NaN
      if (isNaN(numericAmount)) {
        throw new Error("Invalid amount");
      }

      if (!pool?.contract_address) {
        throw new Error("Pool not found");
      }

      if (!tiers) {
        throw new Error("Tiers not loaded");
      }

      // Find the index of the tier in the array
      const tierIndex = tiers.findIndex((t) => t.id === tierId);
      if (tierIndex === -1) {
        throw new Error("Tier not found");
      }

      const contractAddress = pool.contract_address as `0x${string}`;
      console.log(
        `Calling depositToPool with: poolAddress=${contractAddress}, amount=${numericAmount}, tierIndex=${tierIndex}, isZero=${
          numericAmount === 0
        }`
      );

      await depositToPool(contractAddress, numericAmount, tierIndex);
      setIsCommitModalOpen(false);
      router.refresh();
    } catch (error: any) {
      console.error("Error committing to pool:", error);
      showToast.error(error.message || "Failed to commit to pool");
    } finally {
      setIsCommitting(false);
    }
  };

  // Find the user's commitment to this pool
  const getUserCommitment = useCallback(() => {
    if (!dbUser || !commitments) return null;

    // Check for on-chain commitments from both wallet addresses
    const embeddedWalletAddress = privyUser?.wallet?.address;

    // Try all possible wallet addresses
    const userAddresses: string[] = [];

    if (embeddedWalletAddress) {
      userAddresses.push(embeddedWalletAddress.toLowerCase());
    }

    if (smartWalletAddress) {
      userAddresses.push(smartWalletAddress.toLowerCase());
    }

    if (userAddresses.length === 0) return null;

    try {
      // Find the user's commitment in the on-chain data from any of their wallets
      const userCommitment = commitments.find((commitment) =>
        userAddresses.includes(commitment.user.toLowerCase())
      );

      if (!userCommitment) return null;

      // Return the on-chain commitment data
      return {
        user_id: dbUser.id,
        pool_id: poolId,
        amount: Number(userCommitment.amount) / 1_000_000, // Convert from USDC base units (6 decimals)
        created_at: new Date().toISOString(),
        user: dbUser,
        onChain: true,
      };
    } catch (error) {
      console.error("Error getting user commitment:", error);
      return null;
    }
  }, [dbUser, commitments, privyUser, poolId, smartWalletAddress]);

  // Update the logic to check if a pool is funded or unfunded using the shared function
  const displayStatus = pool
    ? getDisplayStatus(
        pool.blockchain_status, // Now we have the raw numeric status
        pool.ends_at,
        pool.raised_amount,
        pool.target_amount
      )
    : null;

  const isFunded = displayStatus === PoolStatus.FUNDED;
  const isUnfunded = displayStatus === PoolStatus.FAILED;

  // Update showCommitButton based on pool status
  useEffect(() => {
    if (isUnfunded) {
      // For unfunded pools, never show the commit button
      setShowCommitButton(false);
    } else {
      // For other pool states (open, funded), show the commit button
      setShowCommitButton(true);
    }
  }, [isUnfunded]);

  // Remove the complex visibility logic
  const commitButtonText = "Commit";

  // Render user commitment section
  const renderUserCommitment = () => {
    const userCommitment = getUserCommitment();

    return (
      <>
        <UserCommitment
          pool={pool}
          dbUser={dbUser}
          userCommitment={userCommitment}
          isCommitmentsLoading={isCommitmentsLoading}
          commitmentsError={commitmentsError}
          usdcBalance={usdcBalance}
          commitAmount={commitAmount}
          isApproving={isCommitting}
          walletsReady={walletsReady}
          handleCommit={async () => {
            setIsCommitModalOpen(true);
            return Promise.resolve();
          }}
          setCommitAmount={setCommitAmount}
          refreshBalance={refreshBalance}
          isUnfunded={isUnfunded}
          handleRefund={handleRefund}
          isRefunding={isRefunding}
        />
      </>
    );
  };

  // Render pool funds section
  const renderPoolFunds = () => {
    if (!pool) return null;
    return (
      <PoolFundsSection pool={pool} isCreator={creator?.id === dbUser?.id} />
    );
  };

  // Check if the current user is the creator of the pool
  const isCreator = dbUser?.id === pool?.creator_id;

  // Handle edit button click
  const handleEditClick = () => {
    if (pool) {
      router.push(`/pools/edit/${pool.id}`);
    }
  };

  // Handle back button click
  const handleBackClick = () => {
    // Get the tab we came from
    const searchParams = new URLSearchParams(window.location.search);
    const fromTab = searchParams.get("from_tab");

    // Navigate back to the pools page with the correct tab
    if (fromTab) {
      router.push(`/pools?tab=${fromTab}`);
    } else {
      router.back();
    }
  };

  // Handle refund claim for unfunded pools
  const handleRefund = async () => {
    try {
      setIsRefunding(true);
      if (!pool?.contract_address) {
        throw new Error("Pool not found");
      }

      if (!isUnfunded) {
        throw new Error("This pool is not eligible for refunds");
      }

      // Call claimRefund from the context
      const result = await claimRefund(pool.contract_address);

      if (result.success) {
        showToast.success("Refund claimed successfully");
        refreshCommitments();
        refreshBalance?.();
      } else {
        showToast.error(result.error || "Failed to claim refund");
      }
    } catch (error: any) {
      console.error("Error claiming refund:", error);
      showToast.error(error.message || "Failed to claim refund");
    } finally {
      setIsRefunding(false);
    }
  };

  // Handle points button click
  const handlePointsClick = () => {
    router.push("/onboarding");
  };

  // Render main content
  const renderContent = () => {
    if (isLoadingPool) {
      return (
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      );
    }

    if (!pool) {
      return (
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-2">Pool Not Found</h1>
            <p className="text-gray-400">
              The pool you're looking for doesn't exist.
            </p>
          </div>
        </div>
      );
    }

    return (
      <div className="container mx-auto px-4 pb-8">
        {/* Pool Header */}
        <PoolHeader
          pool={pool}
          isCreator={isCreator}
          handleEditClick={handleEditClick}
        />
        <div>hi</div>
        {/* Conditional rendering based on pool state */}
        {isFunded ? (
          <>
            <FundedPoolView
              pool={pool}
              renderUserCommitment={renderUserCommitment}
              renderPoolFunds={renderPoolFunds}
              activeTab={contentTab}
              onTabChange={(tab: "overview" | "patrons") => setContentTab(tab)}
              raisedAmount={raisedAmount}
              targetReachedTimestamp={targetReachedTime}
            />

            {/* Tab Content */}
            {contentTab === "overview" && (
              <div className="mt-6">
                {/* Description */}
                <PoolDescription pool={pool} />

                {/* Location */}
                <PoolLocation pool={pool} />

                {/* Token Section */}
                <TokenSection pool={pool} />

                {/* Organizer */}
                <OrganizerSection
                  creator={creator}
                  dbUser={dbUser}
                  onNavigate={(userId) => router.push(`/profile/${userId}`)}
                />

                {/* Extra space at the bottom */}
                <div className="h-8"></div>
              </div>
            )}

            {contentTab !== "overview" && (
              <div className="mt-6">
                {contentTab === "patrons" && (
                  <div className="bg-[#FFFFFF0A] p-4 rounded-[16px] mb-6 w-full">
                    <h3 className="text-xl font-semibold mb-4">Patrons</h3>
                    <PatronsTab poolAddress={pool?.contract_address || null} />

                    {/* Extra space at the bottom */}
                    <div className="h-8"></div>
                  </div>
                )}
              </div>
            )}
          </>
        ) : isUnfunded ? (
          <>
            <UnfundedPoolView
              pool={pool}
              renderUserCommitment={renderUserCommitment}
              activeTab={contentTab}
              onTabChange={(tab: "overview" | "patrons") => setContentTab(tab)}
              raisedAmount={raisedAmount}
              targetAmount={targetAmount}
            />

            {/* Tab Content */}
            {contentTab === "overview" && (
              <div className="mt-6">
                {/* Description */}
                <PoolDescription pool={pool} />

                {/* Location */}
                <PoolLocation pool={pool} />

                {/* Token Section */}
                <TokenSection pool={pool} />

                {/* Organizer */}
                <OrganizerSection
                  creator={creator}
                  dbUser={dbUser}
                  onNavigate={(userId) => router.push(`/profile/${userId}`)}
                />

                {/* Extra space at the bottom */}
                <div className="h-8"></div>
              </div>
            )}

            {contentTab !== "overview" && (
              <div className="mt-6">
                {contentTab === "patrons" && (
                  <div className="bg-[#FFFFFF0A] p-4 rounded-[16px] mb-6 w-full">
                    <h3 className="text-xl font-semibold mb-4">Patrons</h3>
                    <PatronsTab poolAddress={pool?.contract_address || null} />
                  </div>
                )}
              </div>
            )}
          </>
        ) : (
          <>
            <OpenPoolView
              pool={pool}
              days={days}
              hours={hours}
              minutes={minutes}
              seconds={seconds}
              targetAmount={targetAmount}
              raisedAmount={raisedAmount}
              percentage={percentage}
              renderUserCommitment={renderUserCommitment}
              activeTab={contentTab}
              onTabChange={(tab: "overview" | "patrons") => setContentTab(tab)}
            />

            {/* Tab Content */}
            {contentTab === "overview" && (
              <div className="mt-6">
                {/* Description */}
                <PoolDescription pool={pool} />

                {/* Location */}
                <PoolLocation pool={pool} />

                {/* Token Section */}
                <TokenSection pool={pool} />

                {/* Organizer */}
                <OrganizerSection
                  creator={creator}
                  dbUser={dbUser}
                  onNavigate={(userId) => router.push(`/profile/${userId}`)}
                />

                {/* Extra space at the bottom */}
                <div className="h-8"></div>
              </div>
            )}

            {contentTab !== "overview" && (
              <div className="mt-6">
                {contentTab === "patrons" && (
                  <div className="bg-[#FFFFFF0A] p-4 rounded-[16px] mb-6 w-full">
                    <h3 className="text-xl font-semibold mb-4">Patrons</h3>
                    <PatronsTab poolAddress={pool?.contract_address || null} />
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#15161a] text-white flex flex-col">
      <AppHeader
        showBackButton={true}
        showTitle={false}
        backgroundColor="#15161a"
        showGetTokensButton={true}
        showCreateButton={true}
        showPointsButton={true}
        onGetTokensClick={() => setShowTokensModal(true)}
        onInfoClick={() => setShowInfoModal(true)}
        onBackClick={handleBackClick}
        onPointsClick={handlePointsClick}
      />

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto">{renderContent()}</div>

      {/* Fixed bottom elements */}
      <FixedBottomBar
        showCommitButton={showCommitButton}
        onCommitClick={() => setIsCommitModalOpen(true)}
        commitButtonText={commitButtonText}
      />

      {/* Commit Modal */}
      {isCommitModalOpen && (
        <CommitModal
          isOpen={isCommitModalOpen}
          onClose={() => setIsCommitModalOpen(false)}
          onCommit={handleCommit}
          commitAmount={commitAmount}
          setCommitAmount={setCommitAmount}
          isApproving={isCommitting}
          tiers={tiers}
          isLoadingTiers={isLoadingTiers}
        />
      )}

      {/* Get Tokens Modal */}
      {showTokensModal && (
        <GetTokensModal
          isOpen={showTokensModal}
          onClose={() => setShowTokensModal(false)}
        />
      )}

      {/* Info Modal */}
      <InfoModal
        isOpen={showInfoModal}
        onClose={() => setShowInfoModal(false)}
      />
    </div>
  );
}
