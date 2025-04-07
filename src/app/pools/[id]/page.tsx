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
  const { user: privyUser } = usePrivy();
  const router = useRouter();
  const { dbUser } = useSupabase();
  const { smartWalletAddress } = useSmartWallet();
  const { balance: usdcBalance, refresh: refreshBalance } =
    useSmartWalletBalance();

  // State
  const [contentTab, setContentTab] = useState<"overview" | "patrons">(
    "overview"
  );
  const [showCommitButton, setShowCommitButton] = useState(true);
  const [isCommitModalOpen, setIsCommitModalOpen] = useState(false);
  const [commitAmount, setCommitAmount] = useState("");
  const [isCommitting, setIsCommitting] = useState(false);
  const [isRefunding, setIsRefunding] = useState(false);
  const [showTokensModal, setShowTokensModal] = useState(false);
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [showShake, setShowShake] = useState(false);

  // Fetch pool data using our new hook
  const { pool, isLoading, error, mutate } = usePoolDetailsV2(id);

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
  const { days, hours, minutes, seconds } = usePoolTimeLeft(pool);

  // Calculate percentage funded
  const percentage = pool
    ? Math.min(Math.round((pool.raised_amount / pool.target_amount) * 100), 100)
    : 0;

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

    // Get user's commitment from the pool data
    const userCommitment = pool.tiers?.flatMap(
      (tier) =>
        tier.commitments?.filter(
          (c) =>
            c.user_address.toLowerCase() === smartWalletAddress?.toLowerCase()
        ) || []
    )[0];

    if (!userCommitment) return null;

    return (
      <UserCommitment
        pool={pool}
        dbUser={dbUser}
        userCommitment={{
          user_id: dbUser?.id || "",
          pool_id: pool.id,
          amount: userCommitment.amount,
          created_at: userCommitment.committed_at,
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
        isUnfunded={pool.status === "FAILED"}
        handleRefund={async () => {
          /* TODO: Implement refund */
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

  // Log USDC balance when it changes
  useEffect(() => {
    console.log("USDC balance for TiersSection:", {
      usdcBalance,
      shouldBeNonZero: true,
    });
  }, [usdcBalance]);

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
    // First scroll to top
    window.scrollTo({ top: 0, behavior: "smooth" });

    // Wait for scroll to complete before triggering shake
    setTimeout(() => {
      setShowShake(true);
    }, 500); // Wait for scroll to complete
  };

  // Show loading spinner during initial load or when refreshing after an error
  if (isLoading || (!pool && !error)) {
    return (
      <>
        <AppHeader
          showBackButton={true}
          showTitle={false}
          backgroundColor="#15161a"
          showGetTokensButton={true}
          showCreateButton={true}
          showPointsButton={true}
          onBackClick={() => router.push("/pools")}
          onGetTokensClick={() => setShowTokensModal(true)}
          onInfoClick={() => setShowInfoModal(true)}
          onPointsClick={handlePointsClick}
        />
        <div className="container mx-auto px-4 py-2">
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#836EF9]"></div>
          </div>
        </div>
      </>
    );
  }

  // Only show error when we have a real error and we explicitly don't have data
  // This prevents error flashing during hard refresh
  if (error && !pool) {
    console.error("Pool loading error:", error);
    return (
      <>
        <AppHeader
          showBackButton={true}
          showTitle={false}
          backgroundColor="#15161a"
          showGetTokensButton={true}
          showCreateButton={true}
          showPointsButton={true}
          onBackClick={() => router.push("/pools")}
          onGetTokensClick={() => setShowTokensModal(true)}
          onInfoClick={() => setShowInfoModal(true)}
          onPointsClick={handlePointsClick}
        />
        <div className="container mx-auto px-4 py-8">
          <div className="text-center text-red-500">
            Error loading pool details. Please try again later.
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <AppHeader
        showBackButton={true}
        showTitle={false}
        backgroundColor="#15161a"
        showGetTokensButton={true}
        showCreateButton={true}
        showPointsButton={true}
        onBackClick={() => router.push("/pools")}
        onGetTokensClick={() => setShowTokensModal(true)}
        onInfoClick={() => setShowInfoModal(true)}
        onPointsClick={handlePointsClick}
      />

      {/* Commitment Banner - Show only if user has committed */}
      {userCommitments.length > 0 && (
        <CommitmentBanner
          pool={pool}
          userCommitments={userCommitments}
          showShake={showShake}
        />
      )}

      <div className="container mx-auto px-4 py-2 pb-20">
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
            {pool.status === "FUNDED" || pool.status === "EXECUTING" ? (
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
              />
            ) : pool.status === "FAILED" ? (
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
              />
            )}

            {/* Tab Content */}
            {contentTab === "overview" && (
              <div className="mt-6">
                <PoolDescription pool={pool} />
                <PoolLocation pool={pool} />
                <TokenSection pool={pool} />
                <OrganizerSection
                  creator={pool.creator as unknown as User}
                  dbUser={dbUser}
                  onNavigate={(userId) => router.push(`/profile/${userId}`)}
                />
              </div>
            )}

            {contentTab === "patrons" && (
              <div className="mt-6">
                <div className="bg-[#FFFFFF0A] p-4 rounded-[16px] mb-6 w-full">
                  <h3 className="text-xl font-semibold mb-4">Patrons</h3>
                  <PatronsTab pool={pool} isLoading={isLoading} error={error} />
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
        />

        <InfoModal
          isOpen={showInfoModal}
          onClose={() => setShowInfoModal(false)}
        />
      </div>
    </>
  );
}
