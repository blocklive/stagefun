"use client";

import React from "react";
import { SwapInterface } from "@/components/swap/SwapInterface";

export default function SwapPage() {
  return (
    <div className="min-h-screen bg-black py-12">
      <div className="container mx-auto px-4">
        <h1 className="text-3xl font-bold text-center mb-8 text-white">
          StageSwap
        </h1>
        <SwapInterface />
      </div>
    </div>
  );
}
