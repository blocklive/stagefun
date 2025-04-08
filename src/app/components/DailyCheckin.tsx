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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center w-full p-4 bg-[#FFFFFF0A] rounded-lg">
        <LoadingSpinner color="#836EF9" size={20} />
        <span className="ml-2 text-gray-300">Loading...</span>
      </div>
    );
  }

  // Format the time for display
  const displayTime = formatTime(localTime);

  return (
    <div className="w-full p-4 bg-[#FFFFFF0A] rounded-lg flex flex-col md:flex-row gap-4 md:gap-0 md:items-center md:justify-between">
      <div className="mb-2 md:mb-0">
        <div className="text-xl font-semibold text-white">
          {streakCount} day streak
        </div>
        <div className="text-sm text-gray-400 mt-1">
          Claim your daily points every 24 hours
        </div>
      </div>

      <div className="w-full md:w-[180px] flex justify-end">
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
              "Claim +100 pts"
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
  );
};

export default DailyCheckin;
