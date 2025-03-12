"use client";

import { useState } from "react";
import Link from "next/link";
import { Pool } from "@/lib/supabase";
import { SOCIAL_PLATFORMS } from "@/components/SocialLinksInput";
import { FaGlobe, FaDiscord, FaInstagram } from "react-icons/fa";
import { FaXTwitter } from "react-icons/fa6";

type TabType = "overview" | "patrons";

interface TabsAndSocialProps {
  activeTab?: TabType;
  onTabChange?: (tab: TabType) => void;
  pool?: Pool;
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
            </button>
          </div>
        </div>
      </div>

      {/* Social Links - Only show in overview tab and only if social links exist */}
      {activeTab === "overview" && hasSocialLinks && (
        <div className="flex space-x-4 mb-6">
          {/* Render only social links that have values */}
          {Object.entries(socialLinks).map(([platform, url]) => {
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
                <div className="w-10 h-10 bg-[#2A2640] rounded-full flex items-center justify-center hover:bg-[#3A3650] transition-colors">
                  <IconComponent className="text-white" size={20} />
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </>
  );
}
