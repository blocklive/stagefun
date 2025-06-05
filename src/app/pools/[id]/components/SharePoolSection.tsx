"use client";

import React, { useState } from "react";
import { FaShare, FaCopy, FaCheck, FaLink } from "react-icons/fa";
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
            You'll earn points for every commitment made through your link.
            Seriously.
          </p>
        </div>

        <button
          onClick={handleCopyLink}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-[#FFFFFF14] hover:bg-[#FFFFFF20] text-white text-sm font-mono rounded-lg transition-colors border border-[#FFFFFF20] hover:border-[#836EF9]"
        >
          {copied ? (
            <>
              <FaCheck size={14} className="text-green-400" />
              <span className="text-center">Link Copied!</span>
            </>
          ) : (
            <>
              <FaLink size={14} className="text-gray-400 flex-shrink-0" />
              <span className="text-center">{twitterUsername}</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
