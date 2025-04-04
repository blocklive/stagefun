"use client";

import { useState } from "react";
import Image from "next/image";
import { FaChevronUp, FaChevronRight } from "react-icons/fa";
import { Pool } from "../../../../lib/supabase";
import UserAvatar from "@/app/components/UserAvatar";

interface Patron {
  id: string;
  amount: number;
  user?: {
    id: string;
    name?: string;
    avatar_url?: string;
  };
}

interface PatronsSectionProps {
  pool: Pool;
  patrons: Patron[];
}

export default function PatronsSection({ pool, patrons }: PatronsSectionProps) {
  const [showPatrons, setShowPatrons] = useState(true);

  if (!pool || !patrons) return null;

  const { currency } = pool;

  return (
    <div className="mt-6 p-4 bg-[#FFFFFF0A] rounded-[16px]">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">Patrons</h3>
        <button
          onClick={() => setShowPatrons(!showPatrons)}
          className="text-gray-400 hover:text-white"
        >
          {showPatrons ? <FaChevronUp /> : <FaChevronRight />}
        </button>
      </div>

      {showPatrons && (
        <div className="space-y-4">
          {patrons.map((patron) => (
            <div
              key={patron.id}
              className="flex items-center justify-between p-2 rounded-[12px] bg-[#FFFFFF0F]"
            >
              <div className="flex items-center">
                <UserAvatar
                  avatarUrl={patron.user?.avatar_url}
                  name={patron.user?.name || "Anonymous"}
                  size={32}
                  className="mr-2"
                />
                <span className="text-gray-400">
                  {patron.user?.name || "Anonymous"}
                </span>
              </div>
              <span className="font-medium">
                {patron.amount} {currency}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
