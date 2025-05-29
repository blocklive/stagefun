"use client";

import React, { useState } from "react";
import { useReferrals } from "@/hooks/useReferrals";
import { useUserLevel } from "@/hooks/useUserLevel";
import { usePoints } from "@/hooks/usePoints";
import ReferralTable from "./ReferralTable";
import { FiPlus, FiUsers } from "react-icons/fi";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { FaUsers, FaCopy, FaCheck } from "react-icons/fa";
import { useSupabase } from "@/contexts/SupabaseContext";
import showToast from "@/utils/toast";
import { colors } from "@/lib/theme";

// Function to calculate max codes based on user level
function getMaxCodesForLevel(level: number): number {
  if (level <= 5) return 1; // levels 1-5 get 1 code
  return level - 4; // level 6+ gets level-4 codes (level 6 = 2, level 7 = 3, etc.)
}

export default function ReferralSection() {
  const { codes, isLoading, generateCode, isGenerating } = useReferrals();
  const { points } = usePoints();
  const levelInfo = useUserLevel(points || 0);

  const maxCodes = getMaxCodesForLevel(levelInfo.level);
  const currentCodeCount = codes.length;
  const canGenerateMore = currentCodeCount < maxCodes;
  const usedCodes = codes.filter((code: any) => code.used_by_user_id).length;

  const handleGenerateCode = async () => {
    await generateCode();
  };

  return (
    <div className="space-y-4">
      {/* Responsive Header */}
      <div className="py-3 px-4 bg-[#FFFFFF0A] rounded-lg border border-gray-800">
        {/* Desktop layout: single line */}
        <div className="hidden md:flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <FiUsers className="text-[#836EF9]" size={16} />
              <span className="text-white font-medium">Referrals</span>
            </div>

            <div className="flex items-center gap-4 text-sm text-gray-400">
              <span>
                <span className="text-white">{currentCodeCount}</span>/
                {maxCodes} Generated
              </span>
              <span>
                <span className="text-white">{usedCodes}</span> Used
              </span>
              <p className="text-gray-400 text-sm">
                Invite friends and earn{" "}
                <span style={{ color: colors.purple.DEFAULT }}>3000</span>{" "}
                pts/referral
              </p>
            </div>
          </div>

          <button
            onClick={handleGenerateCode}
            disabled={!canGenerateMore || isGenerating}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-sm transition-all ${
              canGenerateMore && !isGenerating
                ? "bg-[#836EF9] hover:bg-[#7C5CE8] text-white"
                : "bg-gray-700 text-gray-400 cursor-not-allowed"
            }`}
          >
            {isGenerating ? (
              <LoadingSpinner size={14} color="currentColor" />
            ) : (
              <FiPlus size={14} />
            )}
            Generate
          </button>
        </div>

        {/* Mobile layout: stacked */}
        <div className="md:hidden space-y-3">
          <div className="flex items-center gap-2">
            <FiUsers className="text-[#836EF9]" size={16} />
            <span className="text-white font-medium">Referrals</span>
          </div>

          <div className="flex items-center gap-4 text-sm text-gray-400">
            <span>
              <span className="text-white">{currentCodeCount}</span>/{maxCodes}{" "}
              Generated
            </span>
            <span>
              <span className="text-white">{usedCodes}</span> Used
            </span>
            <p className="text-gray-400 text-sm">
              Earn <span style={{ color: colors.purple.DEFAULT }}>3000</span>{" "}
              pts/referral
            </p>
          </div>

          <button
            onClick={handleGenerateCode}
            disabled={!canGenerateMore || isGenerating}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-sm transition-all w-full justify-center ${
              canGenerateMore && !isGenerating
                ? "bg-[#836EF9] hover:bg-[#7C5CE8] text-white"
                : "bg-gray-700 text-gray-400 cursor-not-allowed"
            }`}
          >
            {isGenerating ? (
              <LoadingSpinner size={14} color="currentColor" />
            ) : (
              <FiPlus size={14} />
            )}
            Generate
          </button>
        </div>
      </div>

      {/* Table */}
      <ReferralTable codes={codes} isLoading={isLoading} />
    </div>
  );
}
