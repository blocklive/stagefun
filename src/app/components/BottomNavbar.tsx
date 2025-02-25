"use client";

import { useRouter } from "next/navigation";
import { FaHome, FaUserAlt } from "react-icons/fa";

interface BottomNavbarProps {
  activeTab: "party" | "profile";
}

export default function BottomNavbar({ activeTab }: BottomNavbarProps) {
  const router = useRouter();

  return (
    <nav className="absolute bottom-0 left-0 right-0 flex justify-around items-center p-4 bg-gray-800 border-t border-gray-700">
      {/* Party Rounds */}
      <div
        className="flex flex-col items-center cursor-pointer"
        onClick={() => router.push("/pools")}
      >
        <div
          className={`w-6 h-6 ${
            activeTab === "party" ? "bg-purple-500" : "bg-gray-700"
          } rounded-full flex items-center justify-center`}
        >
          <FaHome className="text-sm" />
        </div>
        <span className="text-xs mt-1">Party Rounds</span>
      </div>

      {/* Profile */}
      <div
        className="flex flex-col items-center cursor-pointer"
        onClick={() => router.push("/profile")}
      >
        <div
          className={`w-6 h-6 ${
            activeTab === "profile" ? "bg-purple-500" : "bg-gray-700"
          } rounded-full flex items-center justify-center`}
        >
          <FaUserAlt className="text-sm" />
        </div>
        <span className="text-xs mt-1">Profile</span>
      </div>
    </nav>
  );
}
