import { useMemo } from "react";
import { usePoints } from "./usePoints";
import { useNFTPartners } from "./useNFTPartners";

interface PointsBonusInfo {
  streakMultiplier: number;
  leaderboardMultiplier: number;
  nftMultiplier: number;
  totalMultiplier: number;
  basePoints: number;
  multipliedPoints: number;
  bonusPoints: number;
}

// Leaderboard position multipliers (placeholder - would come from actual leaderboard API)
const getLeaderboardMultiplier = (points: number): number => {
  // Top 1% - 1.5x
  if (points >= 50000) return 1.5;
  // Top 5% - 1.3x
  if (points >= 25000) return 1.3;
  // Top 10% - 1.2x
  if (points >= 15000) return 1.2;
  // Top 25% - 1.1x
  if (points >= 5000) return 1.1;
  // Everyone else - 1x
  return 1.0;
};

// NFT collection multipliers (placeholder - would come from user's wallet)
const getNftMultiplier = (): number => {
  // This would check user's NFT holdings
  // For now, return a base multiplier
  // Could integrate with wallet to check for specific collections
  return 1.0; // Base case - no NFTs
};

export function usePointsBonus(): PointsBonusInfo {
  const { points, multiplierInfo } = usePoints();
  const { activeMultiplier: nftMultiplier } = useNFTPartners();

  return useMemo(() => {
    const basePoints = points || 0;
    const streakMultiplier = multiplierInfo.multiplier;
    const leaderboardMultiplier = getLeaderboardMultiplier(basePoints);

    // Calculate total multiplier (multiplicative)
    const totalMultiplier =
      streakMultiplier * leaderboardMultiplier * nftMultiplier;

    // Calculate multiplied points
    const multipliedPoints = Math.floor(basePoints * totalMultiplier);
    const bonusPoints = multipliedPoints - basePoints;

    return {
      streakMultiplier,
      leaderboardMultiplier,
      nftMultiplier,
      totalMultiplier,
      basePoints,
      multipliedPoints,
      bonusPoints,
    };
  }, [points, multiplierInfo.multiplier, nftMultiplier]);
}
