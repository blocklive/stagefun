"use client";

import React from "react";
import { usePoints } from "../../hooks/usePoints";
import { LoadingSpinner } from "@/components/LoadingSpinner";

interface PointsButtonProps {
  onClick?: () => void;
}

const PointsButton: React.FC<PointsButtonProps> = ({ onClick }) => {
  const { points, isLoading } = usePoints();

  // Format points function
  const formatPoints = (value: number | null): string => {
    if (value === null) {
      return "...";
    }

    if (value < 1000) {
      return value.toString();
    } else {
      return (Math.floor(value / 100) / 10).toFixed(1) + "k";
    }
  };

  return (
    <button
      onClick={onClick}
      className="h-10 flex items-center justify-center px-4 rounded-full bg-[#FFDD5014] text-[#FFDD50] hover:bg-[#FFDD5024] transition-colors border border-[#FFDD5033]"
      aria-label="Points"
    >
      {isLoading ? (
        <LoadingSpinner color="#FFDD50" size={14} />
      ) : (
        <span className="font-medium text-sm">
          {formatPoints(points)}
          <span className="hidden [@media(min-width:385px)]:inline"> pts</span>
        </span>
      )}
    </button>
  );
};

export default PointsButton;
