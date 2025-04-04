"use client";

import React, { useState, useEffect } from "react";
import {
  FaGlobe,
  FaTwitter,
  FaDiscord,
  FaInstagram,
  FaPlus,
  FaMinus,
} from "react-icons/fa";
import { FaXTwitter } from "react-icons/fa6";

// Define the social platform types and their properties
const SOCIAL_PLATFORMS = {
  website: {
    name: "Website",
    icon: FaGlobe,
    placeholder: "Your website",
    prefix: "https://",
    displayPrefix: "",
    color: "#FFFFFF14",
  },
  twitter: {
    name: "X",
    icon: FaXTwitter,
    placeholder: "username",
    prefix: "https://x.com/",
    displayPrefix: "x.com/",
    color: "#FFFFFF14",
  },
  discord: {
    name: "Discord",
    icon: FaDiscord,
    placeholder: "invite-code",
    prefix: "https://discord.gg/",
    displayPrefix: "discord.gg/",
    color: "#FFFFFF14",
  },
  instagram: {
    name: "Instagram",
    icon: FaInstagram,
    placeholder: "username",
    prefix: "https://instagram.com/",
    displayPrefix: "instagram.com/",
    color: "#FFFFFF14",
  },
};

export type SocialLinksType = {
  website?: string;
  twitter?: string;
  discord?: string;
  instagram?: string;
  [key: string]: string | undefined;
};

interface SocialLinksInputProps {
  value: SocialLinksType;
  onChange: (links: SocialLinksType) => void;
}

export default function SocialLinksInput({
  value,
  onChange,
}: SocialLinksInputProps) {
  // Extract usernames from URLs for display in input fields
  const extractUsername = (platform: string, url?: string): string => {
    if (!url) return "";

    if (platform === "website") {
      if (url.startsWith("https://")) return url.substring(8);
      if (url.startsWith("http://")) return url.substring(7);
      return url;
    }

    const prefix =
      SOCIAL_PLATFORMS[platform as keyof typeof SOCIAL_PLATFORMS]?.prefix || "";
    if (prefix && url.startsWith(prefix)) {
      return url.substring(prefix.length);
    }

    return url;
  };

  // Create the full URL when user inputs just the username
  const createFullUrl = (platform: string, username: string): string => {
    if (!username.trim()) return "";

    if (platform === "website") {
      let url = username.trim();
      if (!url.match(/^https?:\/\//)) {
        url = `https://${url}`;
      }
      return url;
    }

    const prefix =
      SOCIAL_PLATFORMS[platform as keyof typeof SOCIAL_PLATFORMS]?.prefix || "";
    return `${prefix}${username.trim()}`;
  };

  // Handle input change for any platform
  const handleInputChange = (platform: string, input: string) => {
    const newLinks = { ...value };

    if (!input.trim()) {
      delete newLinks[platform];
    } else {
      newLinks[platform] = createFullUrl(platform, input);
    }

    onChange(newLinks);
  };

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold mb-4">
        Socials{" "}
        <span className="text-gray-400 text-sm font-normal">(Optional)</span>
      </h2>

      {/* X (Twitter) */}
      <div className="relative">
        <div className="absolute left-4 top-1/2 transform -translate-y-1/2 z-10">
          <div className="w-8 h-8 bg-[#FFFFFF14] rounded-full flex items-center justify-center">
            <SOCIAL_PLATFORMS.twitter.icon
              className="text-gray-400"
              size={18}
            />
          </div>
        </div>
        <div className="flex pl-16">
          <div className="bg-[#FFFFFF0A] text-gray-400 p-4 rounded-l-lg whitespace-nowrap">
            {SOCIAL_PLATFORMS.twitter.displayPrefix}
          </div>
          <input
            type="text"
            placeholder={SOCIAL_PLATFORMS.twitter.placeholder}
            value={extractUsername("twitter", value.twitter)}
            onChange={(e) => handleInputChange("twitter", e.target.value)}
            className="w-full p-4 bg-[#FFFFFF14] rounded-r-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#836EF9]"
          />
        </div>
      </div>

      {/* Discord */}
      <div className="relative">
        <div className="absolute left-4 top-1/2 transform -translate-y-1/2 z-10">
          <div className="w-8 h-8 bg-[#FFFFFF14] rounded-full flex items-center justify-center">
            <SOCIAL_PLATFORMS.discord.icon
              className="text-gray-400"
              size={18}
            />
          </div>
        </div>
        <div className="flex pl-16">
          <div className="bg-[#FFFFFF0A] text-gray-400 p-4 rounded-l-lg whitespace-nowrap">
            {SOCIAL_PLATFORMS.discord.displayPrefix}
          </div>
          <input
            type="text"
            placeholder={SOCIAL_PLATFORMS.discord.placeholder}
            value={extractUsername("discord", value.discord)}
            onChange={(e) => handleInputChange("discord", e.target.value)}
            className="w-full p-4 bg-[#FFFFFF14] rounded-r-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#836EF9]"
          />
        </div>
      </div>

      {/* Instagram */}
      <div className="relative">
        <div className="absolute left-4 top-1/2 transform -translate-y-1/2 z-10">
          <div className="w-8 h-8 bg-[#FFFFFF14] rounded-full flex items-center justify-center">
            <SOCIAL_PLATFORMS.instagram.icon
              className="text-gray-400"
              size={18}
            />
          </div>
        </div>
        <div className="flex pl-16">
          <div className="bg-[#FFFFFF0A] text-gray-400 p-4 rounded-l-lg whitespace-nowrap">
            {SOCIAL_PLATFORMS.instagram.displayPrefix}
          </div>
          <input
            type="text"
            placeholder={SOCIAL_PLATFORMS.instagram.placeholder}
            value={extractUsername("instagram", value.instagram)}
            onChange={(e) => handleInputChange("instagram", e.target.value)}
            className="w-full p-4 bg-[#FFFFFF14] rounded-r-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#836EF9]"
          />
        </div>
      </div>

      {/* Website */}
      <div className="relative">
        <div className="absolute left-4 top-1/2 transform -translate-y-1/2 z-10">
          <div className="w-8 h-8 bg-[#FFFFFF14] rounded-full flex items-center justify-center">
            <SOCIAL_PLATFORMS.website.icon
              className="text-gray-400"
              size={18}
            />
          </div>
        </div>
        <div className="flex pl-16">
          <input
            type="text"
            placeholder={SOCIAL_PLATFORMS.website.placeholder}
            value={extractUsername("website", value.website)}
            onChange={(e) => handleInputChange("website", e.target.value)}
            className="w-full p-4 bg-[#FFFFFF14] rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#836EF9]"
          />
        </div>
      </div>
    </div>
  );
}

// Export the SOCIAL_PLATFORMS object for use in other components
export { SOCIAL_PLATFORMS };
