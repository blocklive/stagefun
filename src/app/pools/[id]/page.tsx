"use client";

import { usePrivy } from "@privy-io/react-auth";
import { useRouter, useParams } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import { FaArrowLeft } from "react-icons/fa";
import { toast } from "react-hot-toast";
import BottomNavbar from "../../components/BottomNavbar";
import SideNavbar from "../../components/SideNavbar";
import { useSupabase } from "../../../contexts/SupabaseContext";
import { useContractInteraction } from "../../../contexts/ContractInteractionContext";
import { useUSDCBalance } from "../../../hooks/useUSDCBalance";
import { usePoolDetails } from "../../../hooks/usePoolDetails";
import { usePoolCommitments } from "../../../hooks/usePoolCommitments";
import { usePoolTimeLeft } from "../../../hooks/usePoolTimeLeft";
import AppHeader from "../../components/AppHeader";

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
    isLoading,
    refresh: refreshPool,
  } = usePoolDetails(poolId);

  // Check if we need to refresh the data (coming from edit page)
  useEffect(() => {
    // Check if the URL has a refresh parameter
    const searchParams = new URLSearchParams(window.location.search);
    const shouldRefresh = searchParams.get("refresh") === "true";

    if (shouldRefresh) {
      console.log("Refreshing pool data after edit...");
      refreshPool();

      // Clean up the URL by removing the refresh parameter
      const newUrl = window.location.pathname;
      window.history.replaceState({}, "", newUrl);
    }
  }, [refreshPool]);

  // Always refresh the pool data when the component mounts
  useEffect(() => {
    console.log("Initial pool data refresh on mount");
    refreshPool();
  }, [refreshPool, poolId]);

  const {
    depositToPool: commitToBlockchain,
    claimRefund,
    isLoading: isBlockchainLoading,
    walletsReady,
    privyReady,
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

  // Add contract interaction
  const { isLoading: isContractLoading } = useContractInteraction();

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
  const [isApproving, setIsApproving] = useState(false);

  // Add state to control button visibility
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

  const handleCommit = async () => {
    if (!pool || !dbUser) return;

    try {
      setIsApproving(true);
      const amount = parseFloat(commitAmount);

      if (isNaN(amount) || amount <= 0) {
        toast.error("Please enter a valid amount");
        return;
      }

      // Show initial toast
      const loadingToast = toast.loading("Preparing your commitment...");

      console.log("Pool details in handleCommit:", {
        id: pool.id,
        name: pool.name,
        contractAddress: pool.contract_address,
      });

      // Convert to USDC base units (6 decimals)
      const amountInBaseUnits = Math.floor(amount * 1_000_000).toString();

      // We need to pass pool.id here, not pool.contract_address
      console.log("Calling commitToBlockchain with:", {
        firstArg: pool.id, // Changed to use pool.id
        amount,
      });

      try {
        // Update toast for USDC approval
        toast.loading("Requesting approval for USDC transfer...", {
          id: loadingToast,
        });

        // Since commitToBlockchain handles both approval and transaction,
        // we'll add a toast for USDC approval before the actual transaction

        // Set up timeouts for toast updates
        const approvalTimeout = setTimeout(() => {
          toast.loading("✅ USDC approved! Initiating transaction...", {
            id: loadingToast,
          });
        }, 3000); // Show after 3 seconds - this is just an estimate

        const submissionTimeout = setTimeout(() => {
          toast.loading("Transaction submitted to blockchain...", {
            id: loadingToast,
          });
        }, 6000); // Show after 6 seconds - this is just an estimate

        // This will handle both approval and transaction submission
        await commitToBlockchain(pool.id, amount);

        // Clear timeouts if transaction completes faster than expected
        clearTimeout(approvalTimeout);
        clearTimeout(submissionTimeout);

        // After successful transaction submission
        toast.loading(
          "Transaction successful! Waiting for final confirmation...",
          { id: loadingToast }
        );

        // Receipt received message
        toast.loading("Receipt received! Finalizing your deposit...", {
          id: loadingToast,
        });

        // Refresh data
        refreshPool();
        refreshBalance();
        refreshCommitments();

        // Success toast with emoji
        toast.success(
          `🎉 Successfully committed ${amount} USDC to ${pool.name}!`,
          { id: loadingToast }
        );
        setCommitAmount("");
        setIsApproving(false);
        setIsCommitModalOpen(false); // Close the modal on success
      } catch (txError) {
        console.error("Transaction error:", txError);
        toast.error(`Transaction failed: ${String(txError)}`, {
          id: loadingToast,
        });
        setIsApproving(false);
      }
    } catch (error) {
      console.error("Error committing to pool:", error);
      toast.error("Failed to commit to pool. Please try again.");
      setIsApproving(false);
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

  // Always show the button for open pools, regardless of whether user has committed
  const shouldShowCommitButton = !!pool && !hasEnded;
  const commitButtonText = "Commit";

  // Effect to determine if commit button should be shown - simplified to avoid flickering
  useEffect(() => {
    if (shouldShowCommitButton !== showCommitButton) {
      setShowCommitButton(shouldShowCommitButton);
    }
  }, [pool, hasEnded, showCommitButton]);

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
          isApproving={isApproving}
          walletsReady={walletsReady}
          handleCommit={handleCommit}
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

  // Check if the current user is the creator of the pool
  const isCreator = dbUser?.id === pool?.creator_id;

  // Handle edit button click
  const handleEditClick = () => {
    if (pool) {
      router.push(`/pools/edit/${pool.id}`);
    }
  };

  // Render main content
  const renderContent = () => {
    if (isLoading) {
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

  return (
    <div className="min-h-screen bg-[#15161a] text-white flex flex-col">
      <SideNavbar activeTab="party" />

      <div className="md:pl-64">
        <div className="relative">
          <AppHeader
            showBackButton={false}
            showTitle={false}
            backgroundColor="#15161a"
            showGetTokensButton={true}
            showCreateButton={true}
            onGetTokensClick={() => setShowTokensModal(true)}
            onInfoClick={() => setShowInfoModal(true)}
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
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-y-auto">{renderContent()}</div>
      </div>

      {/* Fixed bottom elements */}
      <FixedBottomBar
        showCommitButton={showCommitButton}
        onCommitClick={() => setIsCommitModalOpen(true)}
        commitButtonText={commitButtonText}
      />

      {/* Bottom Navigation - Mobile only */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-[#15161a] border-t border-gray-800 md:hidden">
        <BottomNavbar activeTab="party" />
      </div>

      {/* Add padding at the bottom of the main content to prevent overlap - mobile only */}
      <div className="pb-56 md:pb-24"></div>

      {/* Commit Modal */}
      <CommitModal
        isOpen={isCommitModalOpen}
        onClose={() => setIsCommitModalOpen(false)}
        pool={pool}
        dbUser={dbUser}
        usdcBalance={usdcBalance}
        commitAmount={commitAmount}
        isApproving={isApproving}
        isUsingCache={isUsingCachedBalance}
        walletsReady={walletsReady}
        handleMaxClick={handleMaxClick}
        handleCommit={handleCommit}
        setCommitAmount={setCommitAmount}
        refreshBalance={refreshBalance}
      />

      {/* Get Tokens Modal */}
      <GetTokensModal
        isOpen={showTokensModal}
        onClose={() => setShowTokensModal(false)}
      />

      {/* Info Modal */}
      <InfoModal
        isOpen={showInfoModal}
        onClose={() => setShowInfoModal(false)}
      />
    </div>
  );
}
