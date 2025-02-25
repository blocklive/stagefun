"use client";

import { useEffect, useRef, useState } from "react";
import { FaBolt } from "react-icons/fa";
import { Ticker } from "@/data/tickers";

interface AutoScrollerProps {
  items: Ticker[];
}

export default function AutoScroller({ items }: AutoScrollerProps) {
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
  }, [items]);

  return (
    <div className="relative overflow-hidden">
      <style jsx>{`
        @keyframes scroll {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-${scrollWidth}px);
          }
        }
        .auto-scroll {
          animation: scroll 30s linear infinite;
        }
      `}</style>

      <div
        ref={scrollRef}
        className="auto-scroll flex space-x-6 py-2"
        style={{ width: "max-content" }}
      >
        {/* Double the items to create a seamless loop */}
        {[...items, ...items].map((item, index) => (
          <div
            key={`${item.id}-${index}`}
            className="flex items-center space-x-2 whitespace-nowrap"
          >
            {item.icon === "bolt" ? (
              <FaBolt className="text-white" />
            ) : (
              <div
                className={`w-6 h-6 ${item.color} rounded-full flex items-center justify-center text-xs text-white`}
              >
                {item.letter}
              </div>
            )}
            <span>{item.name}</span>
          </div>
        ))}
      </div>

      {/* Gradient overlays */}
      <div className="absolute top-0 left-0 h-full w-12 bg-gradient-to-r from-[#1E1B2E] to-transparent z-10"></div>
      <div className="absolute top-0 right-0 h-full w-12 bg-gradient-to-l from-[#1E1B2E] to-transparent z-10"></div>
    </div>
  );
}
