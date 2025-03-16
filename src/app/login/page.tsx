"use client";

import { usePrivy } from "@privy-io/react-auth";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { FaBolt } from "react-icons/fa";
import Image from "next/image";
import { tickers } from "@/data/tickers";
import { pools } from "@/data/pools";
import AutoScroller from "@/app/components/AutoScroller";
import PoolScroller from "@/app/components/PoolScroller";
import AppHeader from "@/app/components/AppHeader";

export default function LoginPage() {
  const { login, authenticated } = usePrivy();
  const router = useRouter();
  const [viewportHeight, setViewportHeight] = useState("100vh");

  // Use useEffect to handle navigation after render
  useEffect(() => {
    if (authenticated) {
      router.push("/pools");
    }
  }, [authenticated, router]);

  // Set the correct viewport height, accounting for mobile browsers
  useEffect(() => {
    const updateHeight = () => {
      // Use the window's inner height for a more accurate measurement
      setViewportHeight(`${window.innerHeight}px`);
    };

    // Set initial height
    updateHeight();

    // Update on resize
    window.addEventListener("resize", updateHeight);

    // Clean up
    return () => window.removeEventListener("resize", updateHeight);
  }, []);

  return (
    <div
      className="flex flex-col bg-[#1E1B2E] text-white relative"
      style={{ height: viewportHeight }}
    >
      {/* Main content area with scrolling */}
      <div className="flex-1 overflow-y-auto">
        {/* Use the AppHeader component */}
        <AppHeader showTitle={false} backgroundColor="#1E1B2E" />

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
        <div className="px-6 pb-6 flex items-center justify-center">
          <span className="text-gray-500 mr-2">powered by</span>
          <span className="font-bold">MONAD</span>
        </div>
      </div>
    </div>
  );
}
