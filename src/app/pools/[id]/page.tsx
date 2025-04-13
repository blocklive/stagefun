"use client";

import { useParams } from "next/navigation";
import { usePrivy } from "@privy-io/react-auth";
import { useRouter } from "next/navigation";
import { useState, useEffect, useMemo } from "react";
import { useSupabase } from "../../../contexts/SupabaseContext";
import { useSmartWalletBalance } from "../../../hooks/useSmartWalletBalance";
import { usePoolDetailsV2 } from "../../../hooks/usePoolDetailsV2";
import { usePoolTimeLeft } from "../../../hooks/usePoolTimeLeft";
import { useSmartWallet } from "../../../hooks/useSmartWallet";
import { User } from "../../../lib/supabase";
import { Pool, Tier } from "../../../lib/types";
import { DBTier } from "../../../hooks/usePoolTiers";
import { scrollToTop } from "../../../utils/scrollHelper";
import { getUserById } from "../../../lib/services/user-service";
import {
  getDisplayStatus,
  getPoolEffectiveStatus,
} from "../../../lib/contracts/types";
import { useClaimRefund } from "../../../hooks/useClaimRefund";
import showToast from "../../../utils/toast";

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
import AppHeader from "../../components/AppHeader";
import TiersSection from "./components/TiersSection";
import CommitmentBanner from "./components/CommitmentBanner";

export default function PoolDetailsPage() {
  const { id } = useParams() as { id: string };
  const { user: privyUser, authenticated } = usePrivy();
  const router = useRouter();
  const { dbUser } = useSupabase();
  const { smartWalletAddress } = useSmartWallet();
  const { balance: usdcBalance, refresh: refreshBalance } =
    useSmartWalletBalance();
  const { isRefunding, handleClaimRefund } = useClaimRefund();

  // State
  const [contentTab, setContentTab] = useState<"overview" | "patrons">(
    "overview"
  );
  const [showCommitButton, setShowCommitButton] = useState(true);
  const [isCommitModalOpen, setIsCommitModalOpen] = useState(false);
  const [commitAmount, setCommitAmount] = useState("");
  const [isCommitting, setIsCommitting] = useState(false);
  const [showTokensModal, setShowTokensModal] = useState(false);
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [showShake, setShowShake] = useState(false);
  const [patronCount, setPatronCount] = useState<number | undefined>(undefined);
  const [creatorData, setCreatorData] = useState<User | null>(null);

  // Fetch pool data using our new hook
  const { pool: rawPool, isLoading, error, mutate } = usePoolDetailsV2(id);

  // Cast pool to include required properties
  const pool = rawPool as Pool & {
    raised_amount: number;
    target_amount: number;
    contract_address: string;
    title: string;
    creator: {
      id: string;
      name: string;
      avatar_url: string;
    };
    tiers: (DBTier & {
      commitments: {
        user_address: string;
        amount: number;
        committed_at: string;
        user: {
          id: string;
          name: string;
          avatar_url: string;
        };
      }[];
      reward_items: any[];
    })[];
  };

  // Debug pool data when patrons tab is active
  useEffect(() => {
    if (contentTab === "patrons" && pool) {
      console.log("Patron tab active - pool data:", pool);
    }
  }, [contentTab, pool]);

  // Update showCommitButton based on pool status
  useEffect(() => {
    if (pool) {
      // Hide commit button if pool is in EXECUTING status
      setShowCommitButton(pool.status !== "EXECUTING");
    }
  }, [pool?.status, pool]);

  // Get time left - pass the entire pool object
  const { days, hours, minutes, seconds, hasEnded } = usePoolTimeLeft(pool);

  // Calculate percentage funded
  const percentage = pool
    ? Math.min(Math.round((pool.raised_amount / pool.target_amount) * 100), 100)
    : 0;

  // Calculate display status using our helper function
  const displayStatus = pool ? getPoolEffectiveStatus(pool) : "";

  // Determine if user is creator
  const isCreator = dbUser?.id === (pool?.creator?.id || pool?.creator_id);

  // Handle edit click
  const handleEditClick = () => {
    if (pool) {
      router.push(`/pools/edit/${pool.id}`);
    }
  };

  // Handle points click
  const handlePointsClick = () => {
    router.push("/onboarding");
  };

  // Render user commitment section
  const renderUserCommitment = () => {
    if (!pool || !privyUser) return null;

    // Get user's commitments from the pool data across all tiers
    const userCommitments = pool.tiers?.flatMap(
      (tier) =>
        tier.commitments?.filter(
          (c) =>
            c.user_address.toLowerCase() === smartWalletAddress?.toLowerCase()
        ) || []
    );

    if (!userCommitments || userCommitments.length === 0) return null;

    // Calculate total commitment amount across all tiers
    const totalAmount = userCommitments.reduce(
      (sum, commitment) => sum + Number(commitment.amount),
      0
    );

    // Use the most recent commitment date
    const latestCommitment = userCommitments.reduce((latest, current) => {
      const currentDate = new Date(current.committed_at);
      const latestDate = new Date(latest.committed_at);
      return currentDate > latestDate ? current : latest;
    }, userCommitments[0]);

    return (
      <UserCommitment
        pool={pool}
        dbUser={dbUser}
        userCommitment={{
          user_id: dbUser?.id || "",
          pool_id: pool.id,
          amount: totalAmount,
          created_at: latestCommitment.committed_at,
          user: dbUser || ({} as User),
          onChain: true,
        }}
        isCommitmentsLoading={isLoading}
        commitmentsError={error}
        usdcBalance={usdcBalance}
        commitAmount={commitAmount}
        isApproving={isCommitting}
        walletsReady={!!privyUser?.wallet}
        handleCommit={async () => {
          setIsCommitModalOpen(true);
          return Promise.resolve();
        }}
        setCommitAmount={setCommitAmount}
        refreshBalance={refreshBalance}
        isUnfunded={getPoolEffectiveStatus(pool) === "FAILED"}
        handleRefund={async () => {
          return new Promise<void>((resolve, reject) => {
            handleClaimRefund(pool.contract_address, () => {
              // Refresh pool data on success
              mutate();
              resolve();
            });
          });
        }}
        isRefunding={isRefunding}
      />
    );
  };

  // Render pool funds section
  const renderPoolFunds = () => {
    if (!pool || !isCreator) return null;

    return <PoolFundsSection pool={pool} isCreator={isCreator} />;
  };

  // Calculate user's commitments for the banner
  const userCommitments = useMemo(() => {
    if (!pool || !pool.tiers || !dbUser?.id) return [];

    const commitments: { tier: Tier; amount: string }[] = [];
    (pool.tiers as any[]).forEach((tier) => {
      tier.commitments?.forEach((commitment: any) => {
        if (commitment.user?.id === dbUser.id) {
          commitments.push({ tier, amount: commitment.amount.toString() });
        }
      });
    });
    return commitments;
  }, [pool, dbUser]);

  // Add this function to handle successful commits
  const handleCommitSuccess = () => {
    // Scroll to top using our helper function for better mobile compatibility
    scrollToTop();

    // Reset showShake first, then set it true to trigger animation
    setShowShake(false);
    setTimeout(() => {
      setShowShake(true);
    }, 100); // Slightly longer delay to ensure scroll has completed
  };

  // Fetch complete creator data when pool is loaded
  useEffect(() => {
    async function fetchCreatorData() {
      if (pool?.creator?.id) {
        try {
          const userData = await getUserById(pool.creator.id);
          if (userData) {
            setCreatorData(userData);
          }
        } catch (err) {
          console.error("Error fetching creator data:", err);
        }
      }
    }

    if (!isLoading && pool) {
      fetchCreatorData();
    }
  }, [pool, isLoading]);

  // Show loading spinner during initial load or when refreshing after an error
  if (isLoading || (!pool && !error)) {
    return (
      <div className="container mx-auto px-4 py-2">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#836EF9]"></div>
        </div>
      </div>
    );
  }

  // Only show error when we have a real error and we explicitly don't have data
  // This prevents error flashing during hard refresh
  if (error && !pool) {
    console.error("Pool loading error:", error);
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center text-red-500">
          Error loading pool details. Please try again later.
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Commitment Banner - Show only if user has committed */}
      {userCommitments.length > 0 && (
        <CommitmentBanner
          pool={pool}
          userCommitments={userCommitments}
          showShake={showShake}
        />
      )}

      <div className="container mx-auto px-4 pt-5 pb-24">
        {/* Pool Header */}
        <PoolHeader
          pool={pool}
          isCreator={isCreator}
          handleEditClick={handleEditClick}
        />

        {/* Responsive Layout - Uses grid for desktop and stack for mobile */}
        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Left Column - Main Content */}
          <div className="lg:col-span-2">
            {/* Pool Status Views */}
            {displayStatus === "FUNDED" || displayStatus === "EXECUTING" ? (
              <FundedPoolView
                pool={pool}
                renderUserCommitment={renderUserCommitment}
                renderPoolFunds={renderPoolFunds}
                activeTab={contentTab}
                onTabChange={(tab: "overview" | "patrons") =>
                  setContentTab(tab)
                }
                raisedAmount={pool.raised_amount}
                targetReachedTimestamp={undefined}
                isCreator={isCreator}
                onManageClick={handleEditClick}
                patronCount={patronCount}
              />
            ) : displayStatus === "FAILED" ? (
              <UnfundedPoolView
                pool={pool}
                renderUserCommitment={renderUserCommitment}
                activeTab={contentTab}
                onTabChange={(tab: "overview" | "patrons") =>
                  setContentTab(tab)
                }
                raisedAmount={pool.raised_amount}
                targetAmount={pool.target_amount}
                isCreator={isCreator}
                onManageClick={handleEditClick}
                patronCount={patronCount}
              />
            ) : (
              <OpenPoolView
                pool={pool}
                days={days}
                hours={hours}
                minutes={minutes}
                seconds={seconds}
                targetAmount={pool.target_amount}
                raisedAmount={pool.raised_amount}
                percentage={percentage}
                renderUserCommitment={renderUserCommitment}
                activeTab={contentTab}
                onTabChange={(tab: "overview" | "patrons") =>
                  setContentTab(tab)
                }
                isCreator={isCreator}
                onManageClick={handleEditClick}
                patronCount={patronCount}
                hasEnded={hasEnded}
                rawDays={days}
              />
            )}

            {/* Tab Content */}
            {contentTab === "overview" && (
              <div className="mt-6">
                <PoolDescription pool={pool} />
                <PoolLocation pool={pool} />
                <TokenSection pool={pool} />
                <OrganizerSection
                  creator={(creatorData || pool.creator) as unknown as User}
                  dbUser={dbUser}
                  onNavigate={(userId, username) => {
                    if (username) {
                      router.push(`/user/${username}`);
                    } else {
                      router.push(`/profile/${userId}`);
                    }
                  }}
                />
              </div>
            )}

            {contentTab === "patrons" && (
              <div className="mt-6">
                <div className="bg-[#FFFFFF0A] p-4 rounded-[16px] mb-6 w-full">
                  <h3 className="text-xl font-semibold mb-4">Patrons</h3>
                  <PatronsTab
                    pool={pool}
                    isLoading={isLoading}
                    error={error}
                    onPatronCountChange={setPatronCount}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Right Column - Tiers Section (hidden on mobile) */}
          <div className="hidden lg:block">
            <TiersSection
              pool={pool}
              tiers={(pool.tiers as any[]) || []}
              isLoadingTiers={isLoading}
              usdcBalance={usdcBalance}
              onRefreshBalance={refreshBalance}
              userId={dbUser?.id}
              onCommitSuccess={handleCommitSuccess}
              isAuthenticated={authenticated}
            />
          </div>
        </div>

        {/* Mobile Tiers Section (only shown on mobile) */}
        <div className="mt-6 lg:hidden">
          <TiersSection
            pool={pool}
            tiers={(pool.tiers as any[]) || []}
            isLoadingTiers={isLoading}
            usdcBalance={usdcBalance}
            onRefreshBalance={refreshBalance}
            userId={dbUser?.id}
            onCommitSuccess={handleCommitSuccess}
            isAuthenticated={authenticated}
          />
        </div>

        {/* Fixed Bottom Bar - Now hidden as we have tiers with commit buttons */}
        {/* {showCommitButton && (
          <FixedBottomBar
            showCommitButton={true}
            onCommitClick={() => setIsCommitModalOpen(true)}
            commitButtonText="Commit"
          />
        )} */}

        {/* Keep the original commit modal for reference but renamed */}
        <CommitModal
          isOpen={isCommitModalOpen}
          onClose={() => setIsCommitModalOpen(false)}
          commitAmount={commitAmount}
          setCommitAmount={setCommitAmount}
          isApproving={isCommitting}
          tiers={pool.tiers}
          isLoadingTiers={false}
          poolAddress={pool.contract_address || ""}
        />

        <GetTokensModal
          isOpen={showTokensModal}
          onClose={() => setShowTokensModal(false)}
          isAuthenticated={authenticated}
        />

        <InfoModal
          isOpen={showInfoModal}
          onClose={() => setShowInfoModal(false)}
        />
      </div>
    </>
  );
}
