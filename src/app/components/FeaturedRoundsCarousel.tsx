"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { FaChevronLeft, FaChevronRight } from "react-icons/fa";
import { TransformedPool } from "@/hooks/usePoolsWithDeposits";
import UserAvatar from "./UserAvatar";
import CircularProgress from "./CircularProgress";
import { motion } from "framer-motion";

interface FeaturedRoundsCarouselProps {
  pools: TransformedPool[];
}

const CARD_WIDTH = 260;
const CARD_MARGIN = 16;
const CARD_SIZE = CARD_WIDTH + CARD_MARGIN * 2;
const CAROUSEL_HEIGHT = 340; // Estimate: card height + padding
const PLACEHOLDER_CARD_COUNT = 3;

export default function FeaturedRoundsCarousel({
  pools,
}: FeaturedRoundsCarouselProps) {
  const router = useRouter();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [scrollLeftVisible, setScrollLeftVisible] = useState(false);
  const [scrollRightVisible, setScrollRightVisible] = useState(true);
  const [isHovered, setIsHovered] = useState(false);
  const [visibleIndices, setVisibleIndices] = useState<number[]>([]);

  // Check scroll position and update button visibility and visible indices
  const checkScrollButtons = () => {
    if (!scrollRef.current) return;

    const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
    setScrollLeftVisible(scrollLeft > 0);
    setScrollRightVisible(scrollLeft < scrollWidth - clientWidth - 5); // 5px buffer for rounding errors

    // Calculate which cards are currently visible
    const startIndex = Math.floor(scrollLeft / CARD_SIZE);
    const numVisible = Math.ceil(clientWidth / CARD_SIZE);
    const endIndex = Math.min(startIndex + numVisible - 1, pools.length - 1);

    // Store all visible indices
    const indices = [];
    for (let i = startIndex; i <= endIndex; i++) {
      indices.push(i);
    }
    setVisibleIndices(indices);
  };

  useEffect(() => {
    const scrollElement = scrollRef.current;
    if (scrollElement) {
      scrollElement.addEventListener("scroll", checkScrollButtons);

      // Initial check
      checkScrollButtons();

      return () => {
        scrollElement.removeEventListener("scroll", checkScrollButtons);
      };
    }
  }, []);

  // Recalculate on window resize
  useEffect(() => {
    const handleResize = () => {
      checkScrollButtons();
    };

    window.addEventListener("resize", handleResize);

    // Set initial state
    handleResize();

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  // Handle arrow navigation
  const scrollLeft = () => {
    if (!scrollRef.current) return;

    scrollRef.current.scrollBy({
      left: -CARD_SIZE,
      behavior: "smooth",
    });
  };

  const scrollRight = () => {
    if (!scrollRef.current) return;

    scrollRef.current.scrollBy({
      left: CARD_SIZE,
      behavior: "smooth",
    });
  };

  const handlePoolClick = (poolId: string) => {
    router.push(`/pools/${poolId}`);
  };

  // Placeholder skeleton UI
  if (!pools || pools.length === 0) {
    return (
      <div
        className="relative mb-8 pt-4"
        style={{ minHeight: CAROUSEL_HEIGHT }}
      >
        <h2 className="text-2xl font-bold text-white mb-6 px-4">
          Featured rounds
        </h2>
        <div className="relative">
          <div
            className="flex overflow-x-auto hide-scrollbar px-4"
            style={{ minHeight: CAROUSEL_HEIGHT }}
          >
            {Array.from({ length: PLACEHOLDER_CARD_COUNT }).map((_, idx) => (
              <div
                key={idx}
                className="flex-shrink-0"
                style={{
                  width: CARD_WIDTH,
                  margin: `0 ${CARD_MARGIN}px`,
                  height: 320,
                  borderRadius: 16,
                  background: "#23243a",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "flex-end",
                  opacity: 0.7,
                }}
              >
                <div className="w-full h-[260px] bg-[#2A2640] animate-pulse rounded-t-lg" />
                <div className="bg-[#1A1B1F] p-4 animate-pulse rounded-b-lg">
                  <div className="h-6 w-3/4 bg-gray-700 rounded mb-2" />
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-gray-700" />
                    <div className="h-4 w-1/3 bg-gray-700 rounded" />
                    <div className="flex-1 flex items-center gap-2 justify-end">
                      <div className="w-6 h-6 rounded-full bg-gray-700" />
                      <div className="h-4 w-12 bg-gray-700 rounded" />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Get percentage complete for a pool
  const getPercentComplete = (pool: TransformedPool) => {
    if (!pool.target_amount) return 0;
    return Math.min(
      100,
      Math.round((pool.raised_amount / pool.target_amount) * 100)
    );
  };

  // Function to determine if a card is at an edge position (first or last visible)
  const isEdgeCard = (index: number) => {
    if (visibleIndices.length <= 0) return false;

    // If we're at the start (scrollLeftVisible is false), first card should be visible
    if (!scrollLeftVisible && index === 0) return false;

    // If we're at the end (scrollRightVisible is false), last card should be visible
    if (!scrollRightVisible && index === pools.length - 1) return false;

    // Otherwise, check if it's the first or last visible card
    return (
      index === visibleIndices[0] ||
      index === visibleIndices[visibleIndices.length - 1]
    );
  };

  return (
    <div
      className="relative mb-8 pt-4"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <h2 className="text-2xl font-bold text-white mb-6 px-4">
        Featured rounds
      </h2>

      <div className="relative">
        {/* Scroll container */}
        <div
          ref={scrollRef}
          className="flex overflow-x-auto hide-scrollbar px-4"
          style={{ scrollSnapType: "x mandatory" }}
        >
          {pools.map((pool, index) => {
            // Card is dimmed only if it's at the edge
            const opacity = isEdgeCard(index) ? 0.5 : 1;

            return (
              <motion.div
                key={pool.id}
                className="flex-shrink-0 cursor-pointer"
                style={{
                  width: CARD_WIDTH,
                  margin: `0 ${CARD_MARGIN}px`,
                  scrollSnapAlign: "center",
                }}
                whileHover={{ scale: 1.05 }}
                onClick={() => handlePoolClick(pool.id)}
              >
                <div className="rounded-lg overflow-hidden" style={{ opacity }}>
                  {/* Image */}
                  <div className="relative w-full h-[260px]">
                    {pool.image_url ? (
                      <Image
                        src={pool.image_url}
                        alt={pool.name}
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-[#2A2640] flex items-center justify-center">
                        <span className="text-white text-2xl font-bold">
                          {pool.name.substring(0, 2).toUpperCase()}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Pool details */}
                  <div className="bg-[#1A1B1F] p-4">
                    <h3 className="font-semibold text-white text-lg mb-1 truncate whitespace-nowrap overflow-hidden text-ellipsis">
                      {pool.name}
                    </h3>
                    <div className="flex items-center gap-2">
                      <UserAvatar
                        avatarUrl={pool.creator_avatar_url || undefined}
                        name={pool.creator_name || undefined}
                        size={24}
                      />
                      <div className="flex items-center justify-between w-full">
                        <span className="text-sm text-gray-400">
                          {pool.creator_name || "Anonymous"}
                        </span>
                        <div className="flex items-center gap-2">
                          <CircularProgress
                            progress={getPercentComplete(pool)}
                            size={20}
                            strokeWidth={3}
                          />
                          <span className="text-sm text-gray-400">
                            {getPercentComplete(pool)}% funded
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Left/Right navigation buttons - show on hover */}
        {scrollLeftVisible && isHovered && (
          <button
            onClick={scrollLeft}
            className="absolute left-2 top-1/2 transform -translate-y-1/2 rounded-full bg-black bg-opacity-50 p-2 text-white z-10"
            aria-label="Scroll left"
          >
            <FaChevronLeft />
          </button>
        )}

        {scrollRightVisible && isHovered && (
          <button
            onClick={scrollRight}
            className="absolute right-2 top-1/2 transform -translate-y-1/2 rounded-full bg-black bg-opacity-50 p-2 text-white z-10"
            aria-label="Scroll right"
          >
            <FaChevronRight />
          </button>
        )}

        {/* Left/Right fade effect */}
        {scrollLeftVisible && (
          <div className="absolute top-0 left-0 w-12 h-full bg-gradient-to-r from-[#15161A] to-transparent pointer-events-none"></div>
        )}

        {scrollRightVisible && (
          <div className="absolute top-0 right-0 w-12 h-full bg-gradient-to-l from-[#15161A] to-transparent pointer-events-none"></div>
        )}
      </div>
    </div>
  );
}

// Add styling to hide the scrollbar but keep functionality
const style = `
.hide-scrollbar {
  -ms-overflow-style: none;  /* IE and Edge */
  scrollbar-width: none;     /* Firefox */
}
.hide-scrollbar::-webkit-scrollbar {
  display: none;             /* Chrome, Safari and Opera */
}
`;

// Add the styles to the document
if (typeof document !== "undefined") {
  const styleElement = document.createElement("style");
  styleElement.innerHTML = style;
  document.head.appendChild(styleElement);
}
