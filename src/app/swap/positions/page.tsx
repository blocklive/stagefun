"use client";

import React, { Suspense } from "react";
import { PositionsInterfaceOptimized } from "@/components/swap/PositionsInterfaceOptimized";

// Loading component to show while the interface is loading
function LoadingInterface() {
  return (
    <div className="w-full max-w-6xl mx-auto">
      <div className="flex justify-center items-center py-12">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-700 rounded mb-4 w-40"></div>
          <div className="h-4 bg-gray-700 rounded w-20 mb-8"></div>
          <div className="h-24 bg-gray-700 rounded mb-4 w-full"></div>
          <div className="h-24 bg-gray-700 rounded mb-4 w-full"></div>
        </div>
      </div>
    </div>
  );
}

export default function PositionsPage() {
  return (
    <Suspense fallback={<LoadingInterface />}>
      <PositionsInterfaceOptimized />
    </Suspense>
  );
}
