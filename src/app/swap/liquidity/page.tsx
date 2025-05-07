"use client";

import React, { Suspense } from "react";
import { SwapPoolInterface } from "@/components/swap/SwapPoolInterface";

// Loading component to show while the interface is loading
function LoadingInterface() {
  return (
    <div className="w-full max-w-md mx-auto bg-[#1e1e2a] rounded-2xl shadow-md p-6 text-white">
      <div className="animate-pulse">
        <div className="h-8 bg-gray-700 rounded mb-4"></div>
        <div className="h-4 bg-gray-700 rounded w-3/4 mb-8"></div>
        <div className="h-24 bg-gray-700 rounded mb-4"></div>
        <div className="h-16 bg-gray-700 rounded mb-4"></div>
        <div className="h-16 bg-gray-700 rounded mb-4"></div>
        <div className="h-12 bg-gray-700 rounded"></div>
      </div>
    </div>
  );
}

export default function LiquidityPage() {
  return (
    <Suspense fallback={<LoadingInterface />}>
      <SwapPoolInterface />
    </Suspense>
  );
}
