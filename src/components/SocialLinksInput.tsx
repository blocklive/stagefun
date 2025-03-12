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
    color: "#2A2640",
  },
  twitter: {
    name: "X",
    icon: FaXTwitter,
    placeholder: "username",
    prefix: "https://x.com/",
    displayPrefix: "x.com/",
    color: "#2A2640",
  },
  discord: {
    name: "Discord",
    icon: FaDiscord,
    placeholder: "invite-code",
    prefix: "https://discord.gg/",
    displayPrefix: "discord.gg/",
    color: "#2A2640",
  },
  instagram: {
    name: "Instagram",
    icon: FaInstagram,
    placeholder: "username",
    prefix: "https://instagram.com/",
    displayPrefix: "instagram.com/",
    color: "#2A2640",
  },
};

export type SocialLinksType = {
  [key: string]: string;
};

interface SocialLinksInputProps {
  value: SocialLinksType;
  onChange: (links: SocialLinksType) => void;
}

export default function SocialLinksInput({
  value,
  onChange,
}: SocialLinksInputProps) {
  // Initialize with empty values for each platform
  const [links, setLinks] = useState<SocialLinksType>(value || {});
  // Store usernames without prefixes for better UX
  const [usernames, setUsernames] = useState<Record<string, string>>({});
  // Store website without prefix
  const [websiteInput, setWebsiteInput] = useState("");

  // Initialize usernames and website from existing links
  useEffect(() => {
    const initialUsernames: Record<string, string> = {};

    Object.entries(links).forEach(([platform, url]) => {
      if (platform === "website" && url) {
        // Handle website separately
        let websiteValue = url;
        if (websiteValue.startsWith("https://")) {
          websiteValue = websiteValue.substring(8);
        } else if (websiteValue.startsWith("http://")) {
          websiteValue = websiteValue.substring(7);
        }
        setWebsiteInput(websiteValue);
      } else if (url) {
        // Handle social platforms
        const prefix =
          SOCIAL_PLATFORMS[platform as keyof typeof SOCIAL_PLATFORMS]?.prefix ||
          "";
        if (prefix && url.startsWith(prefix)) {
          initialUsernames[platform] = url.substring(prefix.length);
        } else {
          initialUsernames[platform] = url;
        }
      }
    });

    setUsernames(initialUsernames);
  }, []);

  // Update parent component when links change
  useEffect(() => {
    onChange(links);
  }, [links, onChange]);

  // Handle input change for website (full URL)
  const handleWebsiteChange = (input: string) => {
    const newLinks = { ...links };
    setWebsiteInput(input);

    // If URL is empty, remove the platform
    if (!input.trim()) {
      delete newLinks.website;
    } else {
      // Add https:// prefix if not present
      let url = input.trim();
      if (!url.match(/^https?:\/\//)) {
        url = `https://${url}`;
      }
      newLinks.website = url;
    }

    setLinks(newLinks);
  };

  // Handle input change for username-based platforms
  const handleUsernameChange = (platform: string, username: string) => {
    const newUsernames = { ...usernames };
    const newLinks = { ...links };
    const prefix =
      SOCIAL_PLATFORMS[platform as keyof typeof SOCIAL_PLATFORMS]?.prefix || "";

    // Update the username state
    if (!username.trim()) {
      delete newUsernames[platform];
      delete newLinks[platform];
    } else {
      newUsernames[platform] = username.trim();
      // Store the full URL in links
      newLinks[platform] = `${prefix}${username.trim()}`;
    }

    setUsernames(newUsernames);
    setLinks(newLinks);
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
          <div className="w-8 h-8 bg-[#2A2640] rounded-full flex items-center justify-center">
            <SOCIAL_PLATFORMS.twitter.icon className="text-white" size={18} />
          </div>
        </div>
        <div className="flex pl-16">
          <div className="bg-[#1A1727] text-gray-400 p-4 rounded-l-lg whitespace-nowrap">
            {SOCIAL_PLATFORMS.twitter.displayPrefix}
          </div>
          <input
            type="text"
            placeholder={SOCIAL_PLATFORMS.twitter.placeholder}
            value={usernames.twitter || ""}
            onChange={(e) => handleUsernameChange("twitter", e.target.value)}
            className="w-full p-4 bg-[#2A2640] rounded-r-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>
      </div>

      {/* Discord */}
      <div className="relative">
        <div className="absolute left-4 top-1/2 transform -translate-y-1/2 z-10">
          <div className="w-8 h-8 bg-[#2A2640] rounded-full flex items-center justify-center">
            <SOCIAL_PLATFORMS.discord.icon className="text-white" size={18} />
          </div>
        </div>
        <div className="flex pl-16">
          <div className="bg-[#1A1727] text-gray-400 p-4 rounded-l-lg whitespace-nowrap">
            {SOCIAL_PLATFORMS.discord.displayPrefix}
          </div>
          <input
            type="text"
            placeholder={SOCIAL_PLATFORMS.discord.placeholder}
            value={usernames.discord || ""}
            onChange={(e) => handleUsernameChange("discord", e.target.value)}
            className="w-full p-4 bg-[#2A2640] rounded-r-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>
      </div>

      {/* Instagram */}
      <div className="relative">
        <div className="absolute left-4 top-1/2 transform -translate-y-1/2 z-10">
          <div className="w-8 h-8 bg-[#2A2640] rounded-full flex items-center justify-center">
            <SOCIAL_PLATFORMS.instagram.icon className="text-white" size={18} />
          </div>
        </div>
        <div className="flex pl-16">
          <div className="bg-[#1A1727] text-gray-400 p-4 rounded-l-lg whitespace-nowrap">
            {SOCIAL_PLATFORMS.instagram.displayPrefix}
          </div>
          <input
            type="text"
            placeholder={SOCIAL_PLATFORMS.instagram.placeholder}
            value={usernames.instagram || ""}
            onChange={(e) => handleUsernameChange("instagram", e.target.value)}
            className="w-full p-4 bg-[#2A2640] rounded-r-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>
      </div>

      {/* Website */}
      <div className="relative">
        <div className="absolute left-4 top-1/2 transform -translate-y-1/2 z-10">
          <div className="w-8 h-8 bg-[#2A2640] rounded-full flex items-center justify-center">
            <SOCIAL_PLATFORMS.website.icon className="text-white" size={18} />
          </div>
        </div>
        <div className="flex pl-16">
          <input
            type="text"
            placeholder={SOCIAL_PLATFORMS.website.placeholder}
            value={websiteInput}
            onChange={(e) => handleWebsiteChange(e.target.value)}
            className="w-full p-4 bg-[#2A2640] rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>
      </div>
    </div>
  );
}

// Export the SOCIAL_PLATFORMS object for use in other components
export { SOCIAL_PLATFORMS };
