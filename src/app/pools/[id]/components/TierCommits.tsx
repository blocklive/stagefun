import React from "react";
import { Tier } from "../../../../lib/types";
import {
  formatCommitmentCounter,
  isUncapped,
} from "@/lib/utils/contractValues";

interface TierCommitsProps {
  tier: Tier;
}

const TierCommits: React.FC<TierCommitsProps> = ({ tier }) => {
  const totalCommitments = tier.commitments?.length || 0;
  const maxPatrons = tier.max_supply;

  // Use the new formatCommitmentCounter helper
  const commitsDisplay = formatCommitmentCounter(
    totalCommitments,
    maxPatrons || 0,
    "commits"
  );

  return <div className="text-sm text-white/70">{commitsDisplay}</div>;
};

export default TierCommits;
