"use client";

import { usePrivy } from "@privy-io/react-auth";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { FaBolt } from "react-icons/fa";
import Image from "next/image";
import { tickers } from "@/data/tickers";
import { pools } from "@/data/pools";
import AutoScroller from "@/app/components/AutoScroller";
import PoolScroller from "@/app/components/PoolScroller";

export default function LandingPage() {
  const { login, authenticated } = usePrivy();
  const router = useRouter();

  // Use useEffect to handle navigation after render
  useEffect(() => {
    if (authenticated) {
      router.push("/pools");
    }
  }, [authenticated, router]);

  // Don't return null here, as it can cause issues
  // Instead, render the page normally and let the useEffect handle navigation

  return (
    <div className="flex flex-col min-h-screen bg-[#1E1B2E] text-white">
      {/* Header */}
      <header className="flex justify-between items-center p-6">
        <div className="w-12 h-12 bg-purple-500 rounded-lg rotate-45 flex items-center justify-center">
          <div className="w-8 h-8 bg-[#1E1B2E] rounded-md -rotate-45"></div>
        </div>
        <div className="w-10 h-10 bg-gray-800 rounded-full flex items-center justify-center">
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M16 8V6C16 4.89543 15.1046 4 14 4H6C4.89543 4 4 4.89543 4 6V18C4 19.1046 4.89543 20 6 20H14C15.1046 20 16 19.1046 16 18V16M9 12H21M21 12L18 9M21 12L18 15"
              stroke="white"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      </header>

      {/* Auto-scrolling Navigation */}
      <div className="px-6 mt-6">
        <AutoScroller items={tickers} />
      </div>

      {/* Token Cards - Auto Scrolling */}
      <div className="px-6 mt-8">
        <PoolScroller pools={pools} />
      </div>

      {/* Heading */}
      <div className="px-6 mt-12">
        <h1 className="text-5xl font-bold leading-tight">
          Community event
          <br />
          financing for crypto
        </h1>
      </div>

      {/* Login Button */}
      <div className="px-6 mt-12 mb-8">
        <button
          onClick={login}
          className="w-full bg-purple-500 py-4 rounded-full text-white text-lg font-medium"
        >
          Log in with 𝕏
        </button>
      </div>

      {/* Footer */}
      <div className="mt-auto px-6 pb-6 flex items-center justify-center">
        <span className="text-gray-500 mr-2">powered by</span>
        <span className="font-bold">MONAD</span>
      </div>
    </div>
  );
}
