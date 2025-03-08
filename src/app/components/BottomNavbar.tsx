"use client";

import { useRouter } from "next/navigation";
import { FaChartLine } from "react-icons/fa";
import { IoFlash } from "react-icons/io5";

interface BottomNavbarProps {
  activeTab: "party" | "portfolio";
}

export default function BottomNavbar({ activeTab }: BottomNavbarProps) {
  const router = useRouter();

  return (
    <nav className="fixed bottom-0 left-0 right-0 flex justify-around items-center py-5 px-4 bg-black border-t border-gray-800">
      {/* Party Rounds */}
      <div
        className="flex flex-col items-center cursor-pointer"
        onClick={() => router.push("/pools")}
      >
        <div className="flex flex-col items-center">
          <IoFlash
            className={`text-2xl ${
              activeTab === "party" ? "text-[#8B7EF8]" : "text-gray-500"
            }`}
          />
          <span
            className={`text-sm mt-1 ${
              activeTab === "party" ? "text-[#8B7EF8]" : "text-gray-500"
            }`}
          >
            Party Rounds
          </span>
        </div>
      </div>

      {/* Portfolio (links to profile) */}
      <div
        className="flex flex-col items-center cursor-pointer"
        onClick={() => router.push("/profile")}
      >
        <div className="flex flex-col items-center">
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
            className={`text-sm mt-1 ${
              activeTab === "portfolio" ? "text-[#8B7EF8]" : "text-gray-500"
            }`}
          >
            Portfolio
          </span>
        </div>
      </div>
    </nav>
  );
}
