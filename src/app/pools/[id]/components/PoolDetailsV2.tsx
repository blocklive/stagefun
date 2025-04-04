"use client";

import { useEffect, useState } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { useRouter } from "next/navigation";
import { useSupabase } from "../../../../contexts/SupabaseContext";
import { useUSDCBalance } from "../../../../hooks/useUSDCBalance";
import { usePoolDetailsV2 } from "../../../../hooks/usePoolDetailsV2";
import { usePoolTimeLeft } from "../../../../hooks/usePoolTimeLeft";
import { useSmartWallet } from "../../../../hooks/useSmartWallet";
import { PoolStatus } from "../../../../lib/contracts/types";
import { User } from "../../../../lib/supabase";

// Import components
import PoolHeader from "./PoolHeader";
import OpenPoolView from "./OpenPoolView";
import FundedPoolView from "./FundedPoolView";
import TokenSection from "./TokenSection";
import OrganizerSection from "./OrganizerSection";
import UserCommitment from "./UserCommitment";
import PatronsTab from "./PatronsTab";
import PoolFundsSection from "./PoolFundsSection";
import CommitModal from "./CommitModal";
import GetTokensModal from "../../../components/GetTokensModal";
import PoolDescription from "./PoolDescription";
import UnfundedPoolView from "./UnfundedPoolView";
import PoolLocation from "./PoolLocation";
import FixedBottomBar from "./FixedBottomBar";
import InfoModal from "../../../components/InfoModal";

interface PoolDetailsV2Props {
  poolId: string;
}

export default function PoolDetailsV2({ poolId }: PoolDetailsV2Props) {
  const { user: privyUser } = usePrivy();
  const router = useRouter();
  const { dbUser } = useSupabase();
  const { smartWalletAddress } = useSmartWallet();
  const { balance: usdcBalance, refresh: refreshBalance } = useUSDCBalance();

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

  // Fetch pool data using our new hook
  const { pool, isLoading, error, mutate } = usePoolDetailsV2(poolId);

  // Get time left
  const { days, hours, minutes, seconds } = usePoolTimeLeft(pool?.ends_at);

  // Calculate percentage funded
  const percentage = pool
    ? Math.min(Math.round((pool.raised_amount / pool.target_amount) * 100), 100)
    : 0;

  // Determine if user is creator
  const isCreator = dbUser?.id === pool?.creator?.id;

  // Handle edit click
  const handleEditClick = () => {
    if (pool) {
      router.push(`/pools/edit/${pool.id}`);
    }
  };

  // Get user's commitment
  const getUserCommitment = () => {
    if (!dbUser || !pool?.tiers) return null;

    // Check for commitments from both wallet addresses
    const userAddresses = [
      privyUser?.wallet?.address?.toLowerCase(),
      smartWalletAddress?.toLowerCase(),
    ].filter(Boolean);

    if (userAddresses.length === 0) return null;

    // Find commitment across all tiers
    for (const tier of pool.tiers) {
      const userCommitment = tier.commitments?.find((c) =>
        userAddresses.includes(c.user_address.toLowerCase())
      );
      if (userCommitment) {
        return {
          user_id: dbUser.id,
          pool_id: poolId,
          amount: userCommitment.amount,
          created_at: userCommitment.committed_at,
          user: dbUser,
          onChain: true,
        };
      }
    }

    return null;
  };

  // Render user commitment section
  const renderUserCommitment = () => {
    const userCommitment = getUserCommitment();

    return (
      <UserCommitment
        pool={pool}
        dbUser={dbUser}
        userCommitment={userCommitment}
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
        isUnfunded={pool?.blockchain_status === PoolStatus.FAILED}
        handleRefund={async () => {
          /* TODO: Implement refund */
        }}
        isRefunding={isRefunding}
      />
    );
  };

  // Render pool funds section
  const renderPoolFunds = () => {
    if (!pool) return null;
    return <PoolFundsSection pool={pool} isCreator={isCreator} />;
  };

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (error || !pool) {
    return <div>Error loading pool details</div>;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Pool Header */}
      <PoolHeader
        pool={pool}
        isCreator={isCreator}
        handleEditClick={handleEditClick}
      />

      {/* Main Content */}
      {pool.blockchain_status === PoolStatus.EXECUTING ||
      pool.blockchain_status === PoolStatus.FUNDED ? (
        <FundedPoolView
          pool={pool}
          renderUserCommitment={renderUserCommitment}
          renderPoolFunds={renderPoolFunds}
          activeTab={contentTab}
          onTabChange={(tab: "overview" | "patrons") => setContentTab(tab)}
          raisedAmount={pool.raised_amount}
          targetReachedTimestamp={undefined}
        />
      ) : pool.blockchain_status === PoolStatus.FAILED ? (
        <UnfundedPoolView
          pool={pool}
          renderUserCommitment={renderUserCommitment}
          activeTab={contentTab}
          onTabChange={(tab: "overview" | "patrons") => setContentTab(tab)}
          raisedAmount={pool.raised_amount}
          targetAmount={pool.target_amount}
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
          onTabChange={(tab: "overview" | "patrons") => setContentTab(tab)}
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
            <PatronsTab poolAddress={pool.contract_address || null} />
          </div>
        </div>
      )}

      {/* Fixed Bottom Bar */}
      {showCommitButton && (
        <FixedBottomBar
          showCommitButton={true}
          onCommitClick={() => setIsCommitModalOpen(true)}
          commitButtonText="Commit"
        />
      )}

      {/* Modals */}
      <CommitModal
        isOpen={isCommitModalOpen}
        onClose={() => setIsCommitModalOpen(false)}
        onCommit={async () => {
          /* TODO: Implement commit */
        }}
        commitAmount={commitAmount}
        setCommitAmount={setCommitAmount}
        isApproving={isCommitting}
        tiers={pool.tiers}
        isLoadingTiers={false}
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
  );
}
