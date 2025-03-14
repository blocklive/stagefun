"use client";

import { Pool } from "../../../../lib/supabase";
import { FaMapMarkerAlt } from "react-icons/fa";

interface PoolLocationProps {
  pool: Pool | null;
}

export default function PoolLocation({ pool }: PoolLocationProps) {
  if (!pool || !pool.location) return null;

  return (
    <div className="mt-6 p-4 bg-[#FFFFFF0A] rounded-[16px]">
      <h3 className="text-xl font-semibold mb-4">Location</h3>
      <div className="p-4 rounded-[12px] bg-[#FFFFFF0F] flex items-center">
        <FaMapMarkerAlt className="text-[#836EF9] mr-2" />
        <p className="text-white">{pool.location}</p>
      </div>
    </div>
  );
}
