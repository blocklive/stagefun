"use client";

import React, { useState } from "react";
import { FaShare, FaCopy, FaCheck } from "react-icons/fa";
import { useSupabase } from "@/contexts/SupabaseContext";
import showToast from "@/utils/toast";
import { Pool } from "@/lib/supabase";

interface SharePoolSectionProps {
  pool: Pool;
}

export default function SharePoolSection({ pool }: SharePoolSectionProps) {
  const { dbUser } = useSupabase();
  const [copied, setCopied] = useState(false);

  // Check if user has Twitter username
  const hasTwitterUsername = dbUser?.twitter_username;
  const twitterUsername = dbUser?.twitter_username;

  // Generate the referral link
  const generateReferralLink = () => {
    if (!hasTwitterUsername) return "";
    const baseUrl = window.location.origin;
    const poolPath = window.location.pathname;
    return `${baseUrl}${poolPath}?ref=${twitterUsername}`;
  };

  const handleCopyLink = async () => {
    if (!hasTwitterUsername) {
      showToast.error(
        "Connect your Twitter account to share with referral link"
      );
      return;
    }

    try {
      const referralLink = generateReferralLink();
      await navigator.clipboard.writeText(referralLink);
      setCopied(true);
      showToast.success("Referral link copied!");

      // Reset copied state after 2 seconds
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error("Failed to copy link:", error);
      showToast.error("Failed to copy link");
    }
  };

  // Don't show the component if user doesn't have Twitter username
  if (!hasTwitterUsername) {
    return null;
  }

  const referralLink = generateReferralLink();

  return (
    <div className="w-full mt-4">
      <div className="p-4 bg-[#FFFFFF0A] rounded-[16px]">
        <div className="mb-3">
          <h3 className="text-lg font-semibold text-white mb-1">
            Share this party round
          </h3>
          <p className="text-sm text-gray-400">
            Earn trading fees in MON for any commit. Seriously.
          </p>
        </div>

        <div className="bg-[#FFFFFF14] rounded-[12px] p-3">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <p className="text-sm text-gray-300 truncate font-mono">
                {referralLink}
              </p>
            </div>

            <button
              onClick={handleCopyLink}
              className="ml-3 flex items-center gap-2 px-3 py-2 bg-[#836EF9] hover:bg-[#6F5BD0] text-white text-sm font-medium rounded-lg transition-colors"
            >
              {copied ? (
                <>
                  <FaCheck size={14} />
                  Copied
                </>
              ) : (
                <>
                  <FaCopy size={14} />
                  Copy
                </>
              )}
            </button>
          </div>
        </div>

        <div className="mt-3 text-xs text-gray-400">
          You'll earn{" "}
          <span className="text-[#836EF9] font-semibold">
            10 points per USDC
          </span>{" "}
          for every commitment made through your link
        </div>
      </div>
    </div>
  );
}
