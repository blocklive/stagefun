"use client";

import React, { useState, useEffect } from "react";
import { usePoints } from "../../hooks/usePoints";
import { LoadingSpinner } from "@/components/LoadingSpinner";

interface PointsButtonProps {
  onClick?: () => void;
}

const PointsButton: React.FC<PointsButtonProps> = ({ onClick }) => {
  const { points, isLoading } = usePoints();
  const [displayPoints, setDisplayPoints] = useState<string>("0");
  const [showLoading, setShowLoading] = useState<boolean>(true);

  // Format points function
  const formatPoints = (value: number | null): string => {
    if (value === null || value === 0) {
      return "0";
    }

    if (value < 1000) {
      return value.toString();
    } else {
      return (Math.floor(value / 100) / 10).toFixed(1) + "k";
    }
  };

  // Update display points whenever points value changes
  useEffect(() => {
    if (points !== null) {
      setDisplayPoints(formatPoints(points));
      setShowLoading(false);
    }
  }, [points]);

  // Use cached display value after initial load
  useEffect(() => {
    // If we have a cached value and we're just revalidating, don't show loading
    if (displayPoints !== "0") {
      setShowLoading(false);
    } else {
      setShowLoading(isLoading);
    }
  }, [isLoading, displayPoints]);

  return (
    <button
      onClick={onClick}
      className="flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-full bg-[#FFDD5014] text-[#FFDD50] hover:bg-[#FFDD5024] transition-colors border border-[#FFDD5033]"
      aria-label="Points"
    >
      {showLoading ? (
        <LoadingSpinner color="#FFDD50" size={14} />
      ) : (
        <span className="font-medium text-sm">{displayPoints} pts</span>
      )}
    </button>
  );
};

export default PointsButton;
