"use client";

import { useRouter } from "next/navigation";
import { IoFlash } from "react-icons/io5";
import { FaTrophy } from "react-icons/fa";
import { BiTransfer } from "react-icons/bi";

interface BottomNavbarProps {
  activeTab?: "party" | "portfolio" | "leaderboard" | "swap" | "";
  isAuthenticated?: boolean;
}

export default function BottomNavbar({
  activeTab = "", // Default to no active tab
  isAuthenticated = true,
}: BottomNavbarProps) {
  const router = useRouter();

  const handlePortfolioClick = () => {
    // If not authenticated, redirect to login page
    if (!isAuthenticated) {
      router.push("/");
    } else {
      router.push("/profile");
    }
  };

  return (
    <div
      className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-[#15161a] border-t border-gray-800 flex items-center justify-around px-4 z-10"
      style={{
        transform: "translateZ(0)",
        backfaceVisibility: "hidden",
        perspective: 1000,
        willChange: "transform",
        isolation: "isolate",
      }}
    >
      <div
        className="flex flex-col items-center"
        onClick={() => router.push("/pools")}
      >
        <IoFlash
          className={`text-2xl ${
            activeTab === "party" ? "text-[#8B7EF8]" : "text-gray-500"
          }`}
        />
        <span
          className={`text-xs mt-1 ${
            activeTab === "party" ? "text-[#8B7EF8]" : "text-gray-500"
          }`}
        >
          Party Rounds
        </span>
      </div>

      <div
        className="flex flex-col items-center"
        onClick={() => router.push("/swap")}
      >
        <BiTransfer
          className={`text-2xl ${
            activeTab === "swap" ? "text-[#8B7EF8]" : "text-gray-500"
          }`}
        />
        <span
          className={`text-xs mt-1 ${
            activeTab === "swap" ? "text-[#8B7EF8]" : "text-gray-500"
          }`}
        >
          Swap
        </span>
      </div>

      <div
        className="flex flex-col items-center"
        onClick={handlePortfolioClick}
      >
        <div
          className={`text-2xl ${
            activeTab === "portfolio" ? "text-[#8B7EF8]" : "text-gray-500"
          }`}
        >
          <svg
            width="28"
            height="28"
            viewBox="0 0 28 28"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <rect
              x="6"
              y="6"
              width="16"
              height="16"
              stroke="currentColor"
              strokeWidth="2"
            />
            <path
              d="M6 18L12 12L16 16L22 10"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        <span
          className={`text-xs mt-1 ${
            activeTab === "portfolio" ? "text-[#8B7EF8]" : "text-gray-500"
          }`}
        >
          Portfolio
        </span>
      </div>

      <div
        className="flex flex-col items-center"
        onClick={() => router.push("/leaderboard")}
      >
        <FaTrophy
          className={`text-2xl ${
            activeTab === "leaderboard" ? "text-[#8B7EF8]" : "text-gray-500"
          }`}
        />
        <span
          className={`text-xs mt-1 ${
            activeTab === "leaderboard" ? "text-[#8B7EF8]" : "text-gray-500"
          }`}
        >
          Leaderboard
        </span>
      </div>
    </div>
  );
}
