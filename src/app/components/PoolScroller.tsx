"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Pool } from "@/data/pools";

interface PoolScrollerProps {
  pools: Pool[];
}

// Array of background color classes for variety
const bgColors = [
  "bg-purple-500",
  "bg-blue-500",
  "bg-green-500",
  "bg-red-500",
  "bg-yellow-500",
  "bg-indigo-500",
  "bg-pink-500",
  "bg-teal-500",
  "bg-orange-500",
  "bg-cyan-500",
];

export default function PoolScroller({ pools }: PoolScrollerProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [scrollWidth, setScrollWidth] = useState(0);

  useEffect(() => {
    if (scrollRef.current) {
      // Get the width of a single set of items
      setScrollWidth(scrollRef.current.scrollWidth / 2);

      // Ensure smooth animation by handling resize
      const handleResize = () => {
        if (scrollRef.current) {
          setScrollWidth(scrollRef.current.scrollWidth / 2);
        }
      };

      window.addEventListener("resize", handleResize);
      return () => window.removeEventListener("resize", handleResize);
    }
  }, [pools]);

  return (
    <div className="relative overflow-hidden">
      <style jsx>{`
        @keyframes scrollPools {
          0% {
            transform: translateX(-${scrollWidth}px);
          }
          100% {
            transform: translateX(0);
          }
        }
        .auto-scroll-pools {
          animation: scrollPools 45s linear infinite;
        }
      `}</style>

      <div
        ref={scrollRef}
        className="auto-scroll-pools flex py-2"
        style={{ width: "max-content" }}
      >
        {/* Double the items to create a seamless loop */}
        {[...pools, ...pools].map((pool, index) => {
          // Get color based on the original pool index (not the doubled array)
          const colorIndex = index % pools.length;
          const bgColor = bgColors[colorIndex];

          return (
            <div
              key={`${pool.id}-${index}`}
              className="bg-[#2A2640] rounded-3xl overflow-hidden p-4 w-40 flex-shrink-0 mx-6"
            >
              <div
                className={`w-full aspect-square rounded-full ${bgColor} mb-4 overflow-hidden`}
              >
                <div className="w-full h-full flex items-center justify-center text-white text-2xl font-bold">
                  {pool.symbol.charAt(1)}
                </div>
              </div>
              <div className="text-gray-300">{pool.name}</div>
              <div className="text-2xl font-bold">{pool.symbol}</div>
            </div>
          );
        })}
      </div>

      {/* Gradient overlays */}
      <div className="absolute top-0 left-0 h-full w-16 bg-gradient-to-r from-[#1E1B2E] to-transparent z-10"></div>
      <div className="absolute top-0 right-0 h-full w-16 bg-gradient-to-l from-[#1E1B2E] to-transparent z-10"></div>
    </div>
  );
}
