"use client";

import { useRouter } from "next/navigation";
import Image from "next/image";
import { IoFlash } from "react-icons/io5";

interface SideNavbarProps {
  activeTab: "party" | "portfolio";
}

export default function SideNavbar({ activeTab }: SideNavbarProps) {
  const router = useRouter();

  return (
    <nav className="hidden md:flex flex-col h-screen fixed left-0 top-0 w-64 bg-[#15161a] border-r border-gray-800 py-4 px-4">
      {/* Logo */}
      <div
        className="mb-8 px-2 cursor-pointer"
        onClick={() => router.push("/pools")}
      >
        <Image
          src="/stagefunheader.png"
          alt="StageFun Logo"
          width={40}
          height={40}
          className="object-contain"
        />
      </div>

      {/* Navigation Items */}
      <div className="flex flex-col space-y-6">
        {/* Party Rounds */}
        <div
          className="flex items-center cursor-pointer px-4 py-3 rounded-full hover:bg-[#FFFFFF14] transition-colors"
          onClick={() => router.push("/pools")}
        >
          <IoFlash
            className={`text-2xl mr-4 ${
              activeTab === "party" ? "text-[#8B7EF8]" : "text-gray-500"
            }`}
          />
          <span
            className={`text-lg ${
              activeTab === "party" ? "text-[#8B7EF8]" : "text-gray-500"
            }`}
          >
            Party Rounds
          </span>
        </div>

        {/* Portfolio */}
        <div
          className="flex items-center cursor-pointer px-4 py-3 rounded-full hover:bg-[#FFFFFF14] transition-colors"
          onClick={() => router.push("/profile")}
        >
          <div
            className={`text-2xl mr-4 ${
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
            className={`text-lg ${
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
