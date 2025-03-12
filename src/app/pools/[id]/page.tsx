"use client";

import { usePrivy, useWallets } from "@privy-io/react-auth";
import { useRouter, useParams } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import { FaArrowLeft } from "react-icons/fa";
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

// Import components
import PoolHeader from "./components/PoolHeader";
import OpenPoolView from "./components/OpenPoolView";
import TradingPoolView from "./components/TradingPoolView";
import TokenSection from "./components/TokenSection";
import PoolActions from "./components/PoolActions";
import OrganizerSection from "./components/OrganizerSection";
import UserCommitment from "./components/UserCommitment";
import PatronsTab from "./components/PatronsTab";
import PoolFundsSection from "./components/PoolFundsSection";

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

  // Debug contentTab changes
  useEffect(() => {
    console.log("contentTab changed to:", contentTab);
  }, [contentTab]);

  // Add state for approving
  const [isApproving, setIsApproving] = useState(false);

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

      await commitToBlockchain(pool.id, amount); // Using pool.id as expected by useContractInteraction.depositToPool

      // Refresh data
      refreshPool();
      refreshBalance();
      refreshCommitments();

      toast.success("Successfully committed to pool!");
      setCommitAmount("");
      setIsApproving(false);
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

      // Make sure we have a contract address
      if (!pool.contract_address) {
        toast.error("Pool contract address not found");
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

      // Use Biconomy to commit to the pool (gasless transaction)
      // Pass the contract address directly to ensure we're using the right identifier
      await commitToBiconomy(pool.contract_address, amount);

      // Refresh data
      refreshPool();
      refreshBalance();
      refreshCommitments();

      toast.success("Successfully committed to pool with Biconomy (gasless)!");
      setCommitAmount("");
      setIsApproving(false);
    } catch (error) {
      console.error("Error committing to pool with Biconomy:", error);
      toast.error("Failed to commit to pool. Please try again.");
      setIsApproving(false);
    }
  };

  // Find the user's commitment to this pool
  const getUserCommitment = () => {
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
  };

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
                {/* Pool Actions - Only show for Open Pools */}
                <PoolActions
                  pool={pool}
                  dbUser={dbUser}
                  usdcBalance={usdcBalance}
                  commitAmount={commitAmount}
                  isApproving={isApproving}
                  isUsingCache={isUsingCachedBalance}
                  handleMaxClick={handleMaxClick}
                  handleCommit={handleCommit}
                  setCommitAmount={setCommitAmount}
                  refreshBalance={refreshBalance}
                />

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
    <div className="min-h-screen bg-[#0F0D1B] text-white flex flex-col">
      {/* Main Content */}
      <div className="flex-1 overflow-y-auto">
        {/* Back Button - Always show now */}
        <div className="container mx-auto px-4 py-4">
          <button
            onClick={() => router.back()}
            className="flex items-center text-gray-400 hover:text-white"
          >
            <FaArrowLeft className="mr-2" />
            Back
          </button>
        </div>

        {renderContent()}
      </div>

      {/* Bottom Navigation - Always show now */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-[#0F0D1B] border-t border-gray-800">
        <BottomNavbar activeTab="party" />
      </div>
      {/* Add padding at the bottom of the main content to prevent overlap */}
      <div className="pb-32"></div>
    </div>
  );
}
