import { useMemo } from "react";

interface LevelInfo {
  level: number;
  name: string;
  emoji: string;
  currentPoints: number;
  pointsForCurrentLevel: number;
  pointsForNextLevel: number;
  pointsInCurrentLevel: number;
  pointsNeededForNext: number;
  progress: number;
  isMaxLevel: boolean;
}

const LEVELS = [
  { level: 1, name: "Paper Hands", emoji: "⭐", min: 0, max: 1000 },
  { level: 2, name: "Hodler", emoji: "⚡", min: 1001, max: 2500 },
  { level: 3, name: "Degen", emoji: "🔥", min: 2501, max: 4500 },
  { level: 4, name: "Diamond Chad", emoji: "💎", min: 4501, max: 7500 },
  { level: 5, name: "Giga Whale", emoji: "🚀", min: 7501, max: 12000 },
  { level: 6, name: "Moon God", emoji: "👑", min: 12001, max: 18000 },
  { level: 7, name: "Ape Lord", emoji: "🦍", min: 18001, max: 26000 },
  { level: 8, name: "Lambo Driver", emoji: "🏎️", min: 26001, max: 36000 },
  { level: 9, name: "To The Moon", emoji: "🌙", min: 36001, max: 49000 },
  { level: 10, name: "WAGMI Chad", emoji: "💪", min: 49001, max: 65000 },
  { level: 11, name: "Infinity Pool", emoji: "🌊", min: 65001, max: 85000 },
  { level: 12, name: "Galaxy Brain", emoji: "🧠", min: 85001, max: 110000 },
  { level: 13, name: "Rocket Fuel", emoji: "⛽", min: 110001, max: 142000 },
  { level: 14, name: "Mars Colonist", emoji: "🔴", min: 142001, max: 182000 },
  { level: 15, name: "Universe Ruler", emoji: "🌌", min: 182001, max: 233000 },
  {
    level: 16,
    name: "Dimension Hopper",
    emoji: "🌀",
    min: 233001,
    max: 298000,
  },
  { level: 17, name: "Reality Bender", emoji: "🔮", min: 298001, max: 381000 },
  { level: 18, name: "Time Lord", emoji: "⏰", min: 381001, max: 487000 },
  {
    level: 19,
    name: "Multiverse King",
    emoji: "👑✨",
    min: 487001,
    max: 622000,
  },
  { level: 20, name: "Cosmic God", emoji: "✨🌟", min: 622001, max: Infinity },
];

export function useUserLevel(totalPoints: number): LevelInfo {
  return useMemo(() => {
    // Find current level
    const currentLevelData =
      LEVELS.find(
        (level) => totalPoints >= level.min && totalPoints <= level.max
      ) || LEVELS[0];

    const isMaxLevel = currentLevelData.level === LEVELS.length;
    const pointsInCurrentLevel = totalPoints - currentLevelData.min;
    const pointsNeededForCurrentLevel =
      currentLevelData.max - currentLevelData.min + 1;

    // Calculate progress percentage
    let progress = 0;
    if (!isMaxLevel) {
      progress = (pointsInCurrentLevel / pointsNeededForCurrentLevel) * 100;
    } else {
      progress = 100; // Max level is always 100%
    }

    return {
      level: currentLevelData.level,
      name: currentLevelData.name,
      emoji: currentLevelData.emoji,
      currentPoints: totalPoints,
      pointsForCurrentLevel: currentLevelData.min,
      pointsForNextLevel: isMaxLevel ? 0 : currentLevelData.max + 1,
      pointsInCurrentLevel,
      pointsNeededForNext: isMaxLevel
        ? 0
        : currentLevelData.max + 1 - totalPoints,
      progress: Math.min(progress, 100),
      isMaxLevel,
    };
  }, [totalPoints]);
}
