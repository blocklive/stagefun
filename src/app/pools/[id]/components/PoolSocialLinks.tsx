"use client";

import { Pool } from "../../../../lib/supabase";
import { FaDiscord, FaTelegram, FaGlobe } from "react-icons/fa";
import { FaXTwitter } from "react-icons/fa6";

interface PoolSocialLinksProps {
  pool: Pool | null;
}

export default function PoolSocialLinks({ pool }: PoolSocialLinksProps) {
  if (!pool || !pool.social_links) return null;

  const socialLinks = pool.social_links as Record<string, string>;

  // Check if any social links exist
  const hasSocialLinks = Object.values(socialLinks).some((link) => !!link);
  if (!hasSocialLinks) return null;

  return (
    <div className="mt-6 p-4 bg-[#FFFFFF0A] rounded-[16px]">
      <h3 className="text-xl font-semibold mb-4">Social Links</h3>
      <div className="flex flex-wrap gap-4">
        {socialLinks.twitter && (
          <a
            href={
              socialLinks.twitter.startsWith("http")
                ? socialLinks.twitter
                : `https://${socialLinks.twitter}`
            }
            target="_blank"
            rel="noopener noreferrer"
            className="p-3 rounded-[12px] bg-[#FFFFFF0F] flex items-center hover:bg-[#FFFFFF1A] transition-colors"
          >
            <FaXTwitter className="text-[#836EF9] mr-2" />
            <span className="text-white">Twitter</span>
          </a>
        )}

        {socialLinks.discord && (
          <a
            href={
              socialLinks.discord.startsWith("http")
                ? socialLinks.discord
                : `https://${socialLinks.discord}`
            }
            target="_blank"
            rel="noopener noreferrer"
            className="p-3 rounded-[12px] bg-[#FFFFFF0F] flex items-center hover:bg-[#FFFFFF1A] transition-colors"
          >
            <FaDiscord className="text-[#836EF9] mr-2" />
            <span className="text-white">Discord</span>
          </a>
        )}

        {socialLinks.telegram && (
          <a
            href={
              socialLinks.telegram.startsWith("http")
                ? socialLinks.telegram
                : `https://${socialLinks.telegram}`
            }
            target="_blank"
            rel="noopener noreferrer"
            className="p-3 rounded-[12px] bg-[#FFFFFF0F] flex items-center hover:bg-[#FFFFFF1A] transition-colors"
          >
            <FaTelegram className="text-[#836EF9] mr-2" />
            <span className="text-white">Telegram</span>
          </a>
        )}

        {socialLinks.website && (
          <a
            href={
              socialLinks.website.startsWith("http")
                ? socialLinks.website
                : `https://${socialLinks.website}`
            }
            target="_blank"
            rel="noopener noreferrer"
            className="p-3 rounded-[12px] bg-[#FFFFFF0F] flex items-center hover:bg-[#FFFFFF1A] transition-colors"
          >
            <FaGlobe className="text-[#836EF9] mr-2" />
            <span className="text-white">Website</span>
          </a>
        )}
      </div>
    </div>
  );
}
