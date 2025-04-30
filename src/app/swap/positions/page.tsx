"use client";

import React from "react";
import Link from "next/link";
import { PositionsInterface } from "@/components/swap/PositionsInterface";
import { usePathname } from "next/navigation";

export default function PositionsPage() {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-black py-12">
      <div className="container mx-auto px-4">
        <h1 className="text-3xl font-bold text-center mb-4 text-white">
          StageSwap
        </h1>

        {/* Navigation Tabs */}
        <div className="flex justify-center space-x-8 mb-8">
          <Link
            href="/swap"
            className={`text-lg font-medium ${
              pathname === "/swap"
                ? "text-[#836ef9] border-b-2 border-[#836ef9] pb-1"
                : "text-gray-400 hover:text-white pb-1"
            }`}
          >
            Swap
          </Link>
          <Link
            href="/swap/swappool"
            className={`text-lg font-medium ${
              pathname === "/swap/swappool"
                ? "text-[#836ef9] border-b-2 border-[#836ef9] pb-1"
                : "text-gray-400 hover:text-white pb-1"
            }`}
          >
            Add Liquidity
          </Link>
          <Link
            href="/swap/positions"
            className={`text-lg font-medium ${
              pathname === "/swap/positions"
                ? "text-[#836ef9] border-b-2 border-[#836ef9] pb-1"
                : "text-gray-400 hover:text-white pb-1"
            }`}
          >
            Positions
          </Link>
        </div>

        <PositionsInterface />
      </div>
    </div>
  );
}
