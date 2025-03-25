"use client";

import { usePrivy } from "@privy-io/react-auth";
import { useRouter, useParams } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import { FaArrowLeft } from "react-icons/fa";
import { toast } from "react-hot-toast";
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
import {
  getAllTiers,
  Tier,
  commitToTier,
} from "../../../lib/contracts/StageDotFunPool";

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

export default function PoolDetailsPage() {
  const { user: privyUser } = usePrivy();
  const { dbUser } = useSupabase();
  const router = useRouter();
  const params = useParams();
  const poolId = params.id as string;

  const {
    pool,
    creator,
    patrons: poolPatrons,
    targetAmount,
    raisedAmount,
    percentage,
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

  // Combine DB and chain tier data
  const tiers =
    dbTiers && chainTiers
      ? dbTiers.map((dbTier, index) => {
          const chainTier = chainTiers[index];
          if (chainTier) {
            return {
              ...dbTier,
              currentPatrons: Number(chainTier.currentPatrons),
              maxPatrons: Number(chainTier.maxPatrons),
              isActive: chainTier.isActive,
            };
          }
          return dbTier;
        })
      : null;

  const isLoadingTiers = isLoadingDbTiers || isLoadingChainTiers;
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

  // Add state to control button visibility - always true now
  const [showCommitButton, setShowCommitButton] = useState(true);

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
  const handleCommit = async (tierId: string, amount: number) => {
    if (!pool?.contract_address) {
      toast.error("Pool not found");
      return;
    }

    if (!tiers) {
      toast.error("Tiers not loaded");
      return;
    }

    // Add detailed logging
    console.log("Commit attempt details:", {
      tierId,
      amount,
      contractAddress: pool.contract_address,
      allTiers: tiers,
      tierCount: tiers.length,
    });

    // Find the index of the tier in the array
    const tierIndex = tiers.findIndex((t) => t.id === tierId);
    console.log("Found tier index:", {
      tierIndex,
      matchingTier: tiers[tierIndex],
      selectedTierId: tierId,
    });

    if (tierIndex === -1) {
      toast.error("Tier not found");
      return;
    }

    setIsCommitting(true);
    try {
      // Log the values being passed to depositToPool
      console.log("Calling depositToPool with:", {
        contractAddress: pool.contract_address,
        amount,
        tierIndex,
        selectedTier: tiers[tierIndex],
      });

      const result = await depositToPool(
        pool.contract_address,
        amount,
        tierIndex // Use the array index as the contract tier ID
      );

      console.log("depositToPool result:", result);

      if (result.success) {
        refreshPool();
        refreshBalance();
        setIsCommitModalOpen(false);
        setCommitAmount("");
      } else {
        console.error("Failed to commit to tier:", result.error);
      }
    } catch (error) {
      console.error("Error in handleCommit:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to commit to tier"
      );
    } finally {
      setIsCommitting(false);
    }
  };

  // Find the user's commitment to this pool
  const getUserCommitment = useCallback(() => {
    if (!dbUser || !commitments) return null;

    // Only check for on-chain commitments - this is the source of truth
    const walletAddress = privyUser?.wallet?.address;
    if (!walletAddress) return null;

    try {
      // Find the user's commitment in the on-chain data
      const userCommitment = commitments.find(
        (commitment) =>
          commitment.user.toLowerCase() === walletAddress.toLowerCase()
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
  }, [dbUser, commitments, privyUser, poolId]);

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

  // Handle refund functionality
  const handleRefund = async () => {
    if (!pool || !pool.contract_address) {
      toast.error("Pool contract address not found");
      return;
    }

    setIsRefunding(true);
    const loadingToast = toast.loading("Preparing refund...");

    try {
      // Log pool status for debugging
      console.log("Pool status:", {
        blockchain_status: pool.blockchain_status,
        isUnfunded,
        hasEnded,
        raisedAmount: pool.raised_amount,
        targetAmount: pool.target_amount,
      });

      // Get user's LP token balance first to check if they have tokens to refund
      const userCommitment = getUserCommitment();
      console.log("User commitment:", userCommitment);

      if (!userCommitment || userCommitment.amount <= 0) {
        throw new Error("You don't have any tokens to refund in this pool");
      }

      // Call the claimRefund function from the contract
      console.log(
        "Attempting to claim refund for contract:",
        pool.contract_address
      );

      // Update toast message to indicate we're checking pool status
      toast.loading("Checking pool eligibility for refund...", {
        id: loadingToast,
      });

      const result = await claimRefund(pool.contract_address);

      if (!result.success) {
        // If the refund fails, provide more detailed error information
        console.error("Refund failed with result:", result);

        // Check if the error is related to eligibility
        if (result.error && result.error.includes("not eligible for refunds")) {
          throw new Error(
            "This pool is not eligible for refunds yet. The end time must have passed without meeting the target amount."
          );
        } else if (
          result.error &&
          result.error.includes("No LP tokens to refund")
        ) {
          throw new Error(
            "You don't have any LP tokens to refund in this pool."
          );
        } else if (
          result.error &&
          result.error.includes("doesn't have enough USDC")
        ) {
          throw new Error(
            "The pool doesn't have enough USDC to process your refund. Please contact support."
          );
        } else {
          throw new Error(result.error || "Failed to claim refund");
        }
      }

      toast.success("Refund claimed successfully!", { id: loadingToast });
      console.log("Refund result:", result);

      // Refresh data after successful refund
      refreshPool();
      refreshBalance();
      refreshCommitments();
    } catch (error) {
      console.error("Error claiming refund:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to claim refund",
        { id: loadingToast }
      );
    } finally {
      setIsRefunding(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#15161a] text-white flex flex-col">
      <AppHeader
        showBackButton={true}
        showTitle={false}
        backgroundColor="#15161a"
        showGetTokensButton={true}
        showCreateButton={true}
        onGetTokensClick={() => setShowTokensModal(true)}
        onInfoClick={() => setShowInfoModal(true)}
        onBackClick={handleBackClick}
      />

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto">{renderContent()}</div>

      {/* Fixed bottom elements */}
      <FixedBottomBar
        showCommitButton={true}
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
