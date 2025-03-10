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
import PoolDetails from "./components/PoolDetails";
import PoolActions from "./components/PoolActions";
import OrganizerSection from "./components/OrganizerSection";
import PatronsSection from "./components/PatronsSection";
import UserCommitment from "./components/UserCommitment";

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

  const { balance: usdcBalance, refresh: refreshBalance } = useUSDCBalance();

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
  const [contentTab, setContentTab] = useState<
    "overview" | "tokenHolders" | "patrons"
  >("overview");

  // Add state for activation and approving
  const [isActivating, setIsActivating] = useState(false);
  const [isApproving, setIsApproving] = useState(false);

  // Handle max click
  const handleMaxClick = useCallback(() => {
    setCommitAmount(usdcBalance);
  }, [usdcBalance]);

  // Handle toggle pool status
  const handleTogglePoolStatus = async () => {
    if (!pool || !dbUser) return;

    setIsActivating(true);
    try {
      const newStatus =
        pool.blockchain_status === "active" ||
        pool.blockchain_status === "confirmed"
          ? "inactive"
          : "active";
      const response = await fetch("/api/blockchain/update-pool-status", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          poolId: pool.id,
          userId: dbUser.id,
          status: newStatus,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(
          error.error ||
            `Failed to ${
              newStatus === "active" ? "activate" : "deactivate"
            } pool`
        );
      }

      const result = await response.json();
      console.log("Pool status updated:", result);

      // Show success message
      toast.success(
        `Pool ${
          newStatus === "active" ? "activated" : "deactivated"
        } successfully!`
      );

      // Refresh pool data
      await refreshPool();
    } catch (error) {
      console.error("Error updating pool status:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to update pool status"
      );
    } finally {
      setIsActivating(false);
    }
  };

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
      <div className="container mx-auto px-4">
        {/* Pool Header */}
        <PoolHeader pool={pool} isTrading={isTrading} />

        {/* Conditional rendering based on pool state */}
        {isTrading ? (
          <TradingPoolView
            pool={pool}
            renderUserCommitment={renderUserCommitment}
            activeTab={contentTab}
            onTabChange={setContentTab}
            raisedAmount={raisedAmount}
          />
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
              onTabChange={setContentTab}
            />

            {/* Pool Actions - Only show for Open Pools */}
            <PoolActions
              pool={pool}
              dbUser={dbUser}
              usdcBalance={usdcBalance}
              commitAmount={commitAmount}
              isActivating={isActivating}
              isApproving={isApproving}
              handleTogglePoolStatus={handleTogglePoolStatus}
              handleMaxClick={handleMaxClick}
              handleCommit={handleCommit}
              setCommitAmount={setCommitAmount}
            />
          </>
        )}

        {/* Token Section */}
        <TokenSection pool={pool} />

        {/* Pool Details */}
        <PoolDetails pool={pool} isTrading={isTrading} />

        {/* Organizer */}
        <OrganizerSection
          creator={creator}
          dbUser={dbUser}
          onNavigate={(userId) => router.push(`/profile/${userId}`)}
        />

        {/* Patrons */}
        <PatronsSection pool={pool} patrons={patrons || []} />
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#0F0D1B] text-white flex flex-col">
      {/* Main Content */}
      <div className="flex-1 overflow-y-auto">
        {/* Back Button */}
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

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-[#0F0D1B] border-t border-gray-800">
        <BottomNavbar activeTab="party" />
      </div>
      {/* Add padding at the bottom of the main content to prevent overlap */}
      <div className="pb-20"></div>
    </div>
  );
}
