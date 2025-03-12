"use client";

import { usePrivy, useWallets } from "@privy-io/react-auth";
import { useRouter, useParams } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import { FaArrowLeft, FaPlus } from "react-icons/fa";
import { toast } from "react-hot-toast";
import BottomNavbar from "../../components/BottomNavbar";
import { useSupabase } from "../../../contexts/SupabaseContext";
import { useContractInteraction } from "../../../contexts/ContractInteractionContext";
import { useUSDCBalance } from "../../../hooks/useUSDCBalance";
import { usePoolDetails } from "../../../hooks/usePoolDetails";
import { usePoolCommitments } from "../../../hooks/usePoolCommitments";
import { usePoolTimeLeft } from "../../../hooks/usePoolTimeLeft";
import { usePool } from "../../../hooks/usePool";
import { useBiconomyContractInteraction } from "../../../hooks/useBiconomyContractInteraction";
import AppHeader from "../../components/AppHeader";

// Import components
import PoolHeader from "./components/PoolHeader";
import OpenPoolView from "./components/OpenPoolView";
import TradingPoolView from "./components/TradingPoolView";
import TokenSection from "./components/TokenSection";
import OrganizerSection from "./components/OrganizerSection";
import UserCommitment from "./components/UserCommitment";
import PatronsTab from "./components/PatronsTab";
import PoolFundsSection from "./components/PoolFundsSection";
import CommitModal from "./components/CommitModal";
import GetTokensModal from "../../components/GetTokensModal";

export default function PoolDetailsPage() {
  const { user: privyUser } = usePrivy();
  const { wallets, ready } = useWallets();
  const { dbUser } = useSupabase();
  const router = useRouter();
  const params = useParams();
  const poolId = params.id as string;

  const {
    pool,
    targetAmount,
    raisedAmount,
    percentage,
    isLoading,
    refresh: refreshPool,
  } = usePool(poolId);

  const { creator, patrons, isLoading: isPoolLoading } = usePoolDetails(poolId);

  const {
    depositToPool: commitToBlockchain,
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

  // Add Biconomy contract interaction
  const {
    depositToPool: commitToBiconomy,
    isLoading: isBiconomyLoading,
    error: biconomyError,
    walletAddress: biconomyWalletAddress,
  } = useBiconomyContractInteraction();

  // Calculate total committed and target amount from commitments
  const totalCommitted =
    commitments?.reduce(
      (sum, commitment) => sum + Number(commitment.amount),
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

  // Add a new function to handle commits via Biconomy
  const handleBiconomyCommit = async () => {
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

      // Make sure we have a contract address
      if (!pool.contract_address) {
        toast.error("Pool contract address not found", { id: loadingToast });
        return;
      }

      console.log("Pool details in handleBiconomyCommit:", {
        id: pool.id,
        name: pool.name,
        contractAddress: pool.contract_address,
        status: pool.status,
      });

      console.log("Calling commitToBiconomy with:", {
        firstArg: pool.contract_address,
        amount,
      });

      // Update toast for USDC approval
      toast.loading("Requesting approval for USDC transfer...", {
        id: loadingToast,
      });

      // Update toast for approval success
      toast.loading("✅ USDC approved! Preparing gasless transaction...", {
        id: loadingToast,
      });

      // Update toast for transaction in progress
      toast.loading("Transaction submitted to blockchain...", {
        id: loadingToast,
      });

      // Use Biconomy to commit to the pool (gasless transaction)
      await commitToBiconomy(pool.contract_address, amount);

      // Update toast for waiting confirmation
      toast.loading(
        "Transaction successful! Waiting for final confirmation...",
        { id: loadingToast }
      );

      // Update toast for receipt received
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
    } catch (error) {
      console.error("Error committing to pool with Biconomy:", error);
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

  // Debug log for showCommitButton changes
  useEffect(() => {
    console.log("showCommitButton changed:", showCommitButton);
  }, [showCommitButton]);

  // Render user's commitment section
  const renderUserCommitment = () => {
    const userCommitment = getUserCommitment();

    return (
      <UserCommitment
        pool={pool}
        dbUser={dbUser}
        userCommitment={userCommitment}
        isCommitmentsLoading={isCommitmentsLoading}
        commitmentsError={commitmentsError}
        commitAmount={commitAmount}
        isApproving={isApproving}
        walletsReady={walletsReady}
        biconomyWalletAddress={biconomyWalletAddress}
        usdcBalance={usdcBalance}
        setCommitAmount={setCommitAmount}
        handleCommit={handleCommit}
        handleBiconomyCommit={handleBiconomyCommit}
      />
    );
  };

  // Render pool funds section
  const renderPoolFunds = () => {
    return (
      <PoolFundsSection pool={pool} isCreator={creator?.id === dbUser?.id} />
    );
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

    // Check if the pool is in trading mode (ended)
    const isTrading = hasEnded;

    return (
      <div className="container mx-auto px-4 pb-8">
        {/* Pool Header */}
        <PoolHeader pool={pool} isTrading={isTrading} />

        {/* Conditional rendering based on pool state */}
        {isTrading ? (
          <>
            <TradingPoolView
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
                  <div className="bg-[#1A1727] p-4 rounded-lg mb-6 w-full">
                    <h3 className="text-xl font-semibold mb-4">Patrons</h3>
                    <PatronsTab poolAddress={pool?.contract_address || null} />

                    {/* Extra space at the bottom */}
                    <div className="h-8"></div>
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
                  <div className="bg-[#1A1727] p-4 rounded-lg mb-6 w-full">
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
      {/* Use the new AppHeader component without back button */}
      <AppHeader
        showBackButton={false}
        showTitle={false}
        backgroundColor="#15161a"
        showGetTokensButton={true}
        showCreateButton={true}
        onGetTokensClick={() => setShowTokensModal(true)}
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

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto">{renderContent()}</div>

      {/* Commit Button - Fixed above bottom navbar */}
      {showCommitButton && (
        <div className="fixed bottom-20 left-0 right-0 z-50 px-4 py-3 bg-[#15161a] border-t border-gray-800 shadow-lg">
          <div className="container mx-auto">
            <button
              onClick={() => setIsCommitModalOpen(true)}
              className="w-full bg-[#836EF9] hover:bg-[#7058E8] text-white py-4 px-4 rounded-lg font-medium text-lg flex items-center justify-center shadow-lg shadow-purple-900/50 transition-all duration-200 hover:shadow-xl hover:shadow-purple-900/60 hover:transform hover:scale-[1.02]"
            >
              {commitButtonText}
            </button>
          </div>
        </div>
      )}

      {/* Bottom Navigation - Always show now */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-[#15161a] border-t border-gray-800">
        <BottomNavbar activeTab="party" />
      </div>

      {/* Add padding at the bottom of the main content to prevent overlap */}
      <div className="pb-56"></div>

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
        biconomyWalletAddress={biconomyWalletAddress}
        handleMaxClick={handleMaxClick}
        handleCommit={handleCommit}
        handleBiconomyCommit={handleBiconomyCommit}
        setCommitAmount={setCommitAmount}
        refreshBalance={refreshBalance}
      />

      {/* Get Tokens Modal */}
      <GetTokensModal
        isOpen={showTokensModal}
        onClose={() => setShowTokensModal(false)}
      />
    </div>
  );
}
