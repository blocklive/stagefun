"use client";

import React from "react";
import { FaBolt } from "react-icons/fa";
import { usePoints } from "../../hooks/usePoints";
import { LoadingSpinner } from "@/components/LoadingSpinner";

interface PointsButtonProps {
  onClick?: () => void;
}

const PointsButton: React.FC<PointsButtonProps> = ({ onClick }) => {
  const { points, isLoading } = usePoints();

  const formattedPoints = points !== null ? points.toLocaleString() : "0";

  return (
    <button
      onClick={onClick}
      className="flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-full bg-[#FFDD5014] text-[#FFDD50] hover:bg-[#FFDD5024] transition-colors border border-[#FFDD5033]"
      aria-label="Points"
    >
      <FaBolt className="text-[#FFDD50] text-sm" />
      {isLoading ? (
        <LoadingSpinner color="#FFDD50" size={14} />
      ) : (
        <span className="font-medium text-sm">{formattedPoints} pts</span>
      )}
    </button>
  );
};

export default PointsButton;
