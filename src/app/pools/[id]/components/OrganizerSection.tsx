"use client";

import Image from "next/image";
import { FaChevronRight } from "react-icons/fa";
import { User } from "../../../../lib/supabase";

interface OrganizerSectionProps {
  creator: User | null;
  dbUser: User | null;
  onNavigate: (userId: string) => void;
}

export default function OrganizerSection({
  creator,
  dbUser,
  onNavigate,
}: OrganizerSectionProps) {
  if (!creator) return null;

  return (
    <div
      className="mt-6 mb-8 p-4 bg-[#2A2640] rounded-lg cursor-pointer hover:bg-[#352f54] transition-colors"
      onClick={() => onNavigate(creator.id)}
    >
      <h3 className="text-lg font-semibold mb-4">Organizer</h3>
      <div className="flex items-center justify-between">
        <div className="flex items-center">
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
              {creator.name || "Anonymous"}
              {dbUser?.id === creator.id && (
                <span className="ml-2 text-purple-400 text-sm">You</span>
              )}
            </div>
            <div className="text-sm text-gray-400">Eth Denver</div>
          </div>
        </div>
        <div className="text-gray-400">
          <FaChevronRight />
        </div>
      </div>
    </div>
  );
}
