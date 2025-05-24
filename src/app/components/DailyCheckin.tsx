"use client";

import React, { useState, useEffect } from "react";
import { usePoints } from "../../hooks/usePoints";
import { FaClock } from "react-icons/fa";
import { LoadingSpinner } from "@/components/LoadingSpinner";

// Function to format time directly in our component
const formatTime = (milliseconds: number): string => {
  if (milliseconds <= 0) {
    return "Available now";
  }

  const seconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
};

const DailyCheckin = () => {
  const {
    isLoading,
    streakCount,
    canClaim,
    timeUntilNextClaim,
    claimDailyPoints,
    multiplierInfo,
  } = usePoints();
  const [isClicking, setIsClicking] = useState(false);
  const [localTime, setLocalTime] = useState(timeUntilNextClaim);

  // Update our local copy of the time
  useEffect(() => {
    setLocalTime(timeUntilNextClaim);
  }, [timeUntilNextClaim]);

  // Set up our own countdown timer
  useEffect(() => {
    if (!canClaim && localTime > 0) {
      const timer = setInterval(() => {
        setLocalTime((prev) => Math.max(0, prev - 1000));
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [canClaim, localTime]);

  const handleClaim = async () => {
    setIsClicking(true);
    await claimDailyPoints();
    setTimeout(() => setIsClicking(false), 1500);
  };

  // Get fire emoji count based on tier
  const getFireEmojis = (multiplier: number) => {
    if (multiplier >= 2.0) return "🔥🔥🔥"; // Legendary
    if (multiplier >= 1.75) return "🔥🔥"; // Devoted
    if (multiplier >= 1.5) return "🔥"; // Committed+
    return ""; // Lower tiers
  };

  // Get tier-based separator emoji
  const getTierSeparator = (tier: string) => {
    switch (tier) {
      case "Paper Hands":
        return "⭐";
      case "Hodler":
        return "⚡";
      case "Degen":
        return "🔥";
      case "Diamond Chad":
        return "💎";
      case "Giga Whale":
        return "🚀";
      case "Moon God":
        return "👑";
      default:
        return "⭐";
    }
  };

  if (isLoading) {
    return (
      <div className="w-full p-4 bg-[#FFFFFF0A] rounded-xl">
        <div className="flex items-center justify-center">
          <LoadingSpinner color="#836EF9" size={20} />
          <span className="ml-2 text-gray-300">Loading...</span>
        </div>
      </div>
    );
  }

  // Format the time for display
  const displayTime = formatTime(localTime);

  return (
    <div className="w-full p-4 bg-[#FFFFFF0A] rounded-xl">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div className="flex-shrink-0">
          {/* Main streak display with fire and multiplier on same line */}
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-bold text-white text-base flex items-center gap-1">
              <span>{streakCount} day streak</span>
              {getFireEmojis(multiplierInfo.multiplier) && (
                <span>{getFireEmojis(multiplierInfo.multiplier)}</span>
              )}
            </h3>
            {multiplierInfo.multiplier > 1 && (
              <span className="text-[#FFDD50] text-sm font-bold">
                {getTierSeparator(multiplierInfo.tier)}{" "}
                {multiplierInfo.multiplier}x
              </span>
            )}
          </div>

          {/* Progression info only */}
          <div className="text-sm text-gray-500 flex items-center gap-3">
            {multiplierInfo.nextTierAt && multiplierInfo.nextTierMultiplier && (
              <span className="text-xs">
                <span className="text-[#FFDD50] font-medium">
                  {multiplierInfo.nextTierAt - streakCount} days
                </span>{" "}
                until{" "}
                <span className="text-[#FFDD50] font-medium">
                  {multiplierInfo.nextTierMultiplier}x
                </span>
              </span>
            )}
          </div>
        </div>
        <div className="w-full md:w-auto">
          {canClaim ? (
            <button
              onClick={handleClaim}
              disabled={isClicking}
              className={`w-full py-3 px-6 font-medium rounded-lg flex items-center justify-center transition-all duration-200 ${
                isClicking
                  ? "bg-gray-400 text-gray-700 opacity-70 transform scale-95 cursor-default shadow-inner border-2 border-gray-500"
                  : "bg-white hover:bg-gray-100 text-[#15161A] hover:shadow-sm border border-transparent"
              }`}
            >
              {isClicking ? (
                <div className="flex items-center">
                  <LoadingSpinner color="#666666" size={14} />
                  <span className="ml-2">Processing...</span>
                </div>
              ) : (
                <span>
                  Claim +{multiplierInfo.points} pts
                  {multiplierInfo.multiplier > 1 && (
                    <span className="text-sm ml-1 opacity-75">
                      ({multiplierInfo.multiplier}x)
                    </span>
                  )}
                </span>
              )}
            </button>
          ) : (
            <div className="w-full py-3 px-6 bg-gray-300 text-[#15161A] font-medium rounded-lg flex items-center justify-center">
              <FaClock
                className="text-gray-500 animate-pulse flex-shrink-0 mr-2"
                size={14}
              />
              <span className="font-mono text-sm md:text-base whitespace-nowrap">
                {displayTime}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DailyCheckin;
