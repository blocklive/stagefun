"use client";

import Image from "next/image";
import { FaChevronRight } from "react-icons/fa";
import { User } from "../../../../lib/supabase";
import { getFormattedCreatorName } from "../../../../lib/utils";

interface OrganizerSectionProps {
  creator: User | null;
  dbUser: User | null;
  onNavigate: (userId: string, username?: string) => void;
}

export default function OrganizerSection({
  creator,
  dbUser,
  onNavigate,
}: OrganizerSectionProps) {
  if (!creator) return null;

  const handleNavigate = () => {
    if (creator.username) {
      onNavigate(creator.id, creator.username);
    } else {
      onNavigate(creator.id);
    }
  };

  return (
    <div className="mt-6 p-4 bg-[#FFFFFF0A] rounded-[16px]">
      <h3 className="text-xl font-semibold mb-4">Organizer</h3>
      <div className="p-4 rounded-[12px] bg-[#FFFFFF0F]">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <a
              href={
                creator.username
                  ? `/user/${creator.username}`
                  : `/user/${creator.id}`
              }
              className="flex items-center hover:opacity-80 transition-opacity"
            >
              {creator.avatar_url ? (
                <div className="w-12 h-12 rounded-full overflow-hidden mr-3">
                  <Image
                    src={creator.avatar_url}
                    alt={creator.name || "Organizer"}
                    width={48}
                    height={48}
                    className="object-cover w-full h-full"
                  />
                </div>
              ) : (
                <div className="w-12 h-12 rounded-full bg-purple-500 flex items-center justify-center mr-3">
                  <span className="text-white text-lg font-bold">
                    {creator.name?.charAt(0) || "?"}
                  </span>
                </div>
              )}
              <div>
                <div className="font-semibold text-white">
                  {getFormattedCreatorName(creator)}
                  {dbUser?.id === creator.id && (
                    <span className="ml-2 text-purple-400 text-sm">You</span>
                  )}
                </div>
              </div>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
