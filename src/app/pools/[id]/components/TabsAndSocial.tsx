"use client";

import { useState } from "react";
import Link from "next/link";
import { Pool } from "@/lib/supabase";
import { SOCIAL_PLATFORMS } from "@/app/components/SocialLinksInput";
import { FaGlobe, FaDiscord, FaInstagram } from "react-icons/fa";
import { FaXTwitter } from "react-icons/fa6";

type TabType = "overview" | "patrons";

interface TabsAndSocialProps {
  activeTab?: TabType;
  onTabChange?: (tab: TabType) => void;
  pool?: Pool;
  isCreator?: boolean;
  onManageClick?: () => void;
  patronCount?: number;
}

// Fallback icons if SOCIAL_PLATFORMS is not available
const FALLBACK_ICONS = {
  website: FaGlobe,
  twitter: FaXTwitter,
  discord: FaDiscord,
  instagram: FaInstagram,
};

export default function TabsAndSocial({
  activeTab = "overview",
  onTabChange,
  pool,
  isCreator = false,
  onManageClick,
  patronCount = 0,
}: TabsAndSocialProps) {
  const handleTabClick = (tab: TabType) => {
    if (onTabChange) {
      onTabChange(tab);
    }
  };

  // Get social links from the pool
  const socialLinks = pool?.social_links || {};

  // Check if any social links exist
  const hasSocialLinks = Object.values(socialLinks).some((link) => !!link);

  return (
    <>
      {/* Navigation Tabs */}
      <div className="mb-6">
        <div className="flex overflow-x-auto">
          <div className="flex space-x-2">
            <button
              className={`px-6 py-3 rounded-full ${
                activeTab === "overview"
                  ? "bg-white text-black font-medium"
                  : "bg-transparent text-white border border-gray-700"
              }`}
              onClick={() => handleTabClick("overview")}
            >
              Overview
            </button>
            <button
              className={`px-6 py-3 rounded-full ${
                activeTab === "patrons"
                  ? "bg-white text-black font-medium"
                  : "bg-transparent text-white border border-gray-700"
              }`}
              onClick={() => handleTabClick("patrons")}
            >
              Patrons
              {activeTab !== "patrons" && patronCount > 0 && (
                <span className="ml-1 text-gray-400">{patronCount}</span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Social Links and Manage Button - Only show in overview tab */}
      {activeTab === "overview" && (
        <div className="flex justify-between items-center mb-6">
          {/* Social Links */}
          <div className="flex space-x-4">
            {/* Render only social links that have values */}
            {hasSocialLinks &&
              Object.entries(socialLinks).map(([platform, url]) => {
                if (!url) return null;

                // Get the icon component for this platform
                const IconComponent =
                  FALLBACK_ICONS[platform as keyof typeof FALLBACK_ICONS] ||
                  FaGlobe;

                return (
                  <Link
                    key={platform}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`Visit ${platform}`}
                  >
                    <div className="w-10 h-10 bg-[#FFFFFF14] rounded-full flex items-center justify-center hover:bg-[#FFFFFF1A] transition-colors">
                      <IconComponent className="text-white" size={20} />
                    </div>
                  </Link>
                );
              })}
          </div>

          {/* Manage Button - Only show if user is the creator */}
          {isCreator && onManageClick && (
            <button
              onClick={onManageClick}
              className="flex items-center gap-2 px-4 py-2 bg-[#FFFFFF14] rounded-[16px] text-white hover:bg-opacity-80 transition-all"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M17 3a2.85 2.85 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path>
              </svg>
              <span>Manage</span>
            </button>
          )}
        </div>
      )}
    </>
  );
}
