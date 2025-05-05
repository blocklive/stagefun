import React, { useState, useRef, useEffect } from "react";
import Image from "next/image";
import { ChevronDownIcon } from "@heroicons/react/24/solid";
import { Token } from "@/types/token";
import { EnhancedTokenSelector } from "./EnhancedTokenSelector";

interface TokenSelectorProps {
  selectedToken: Token | null;
  onTokenSelect: (token: Token) => void;
  tokens?: Token[];
  disabled?: boolean;
  excludeAddresses?: string[];
  title?: string;
  onlyMainTokens?: boolean;
}

export function TokenSelector({
  selectedToken,
  onTokenSelect,
  tokens = [],
  disabled = false,
  excludeAddresses = [],
  title,
  onlyMainTokens = false,
}: TokenSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Get the swap container dimensions
  const [modalPosition, setModalPosition] = useState({
    left: 0,
    top: 0,
    width: 0,
  });

  // Update modal position based on the container position
  useEffect(() => {
    if (isOpen && containerRef.current) {
      // Look for the swap container (the main card containing the swap UI)
      const swapContainer = document.querySelector(
        ".max-w-md.mx-auto.bg-\\[\\#1e1e2a\\]"
      );

      if (swapContainer) {
        const swapRect = swapContainer.getBoundingClientRect();
        const modalWidth = 360; // The width of our modal

        // Calculate position to center the modal on the swap container
        // The offset needs to center the 360px modal over the swap UI
        const leftOffset = swapRect.left + (swapRect.width - modalWidth) / 2;

        setModalPosition({
          left: leftOffset,
          top: Math.max(20, swapRect.top + window.scrollY - 80), // Position above the swap UI but not too high
          width: modalWidth,
        });
      } else {
        // Fallback if we can't find the swap container
        const rect = containerRef.current.getBoundingClientRect();
        const viewportWidth = window.innerWidth;
        const modalWidth = 360;

        setModalPosition({
          left: Math.max(0, (viewportWidth - modalWidth) / 2),
          top: Math.max(20, rect.top + window.scrollY - 300),
          width: modalWidth,
        });
      }
    }
  }, [isOpen]);

  return (
    <div ref={containerRef}>
      <button
        type="button"
        className={`flex items-center space-x-2 p-2 rounded-lg hover:bg-gray-700 transition-colors ${
          disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
        }`}
        onClick={() => !disabled && setIsOpen(true)}
        disabled={disabled}
      >
        {selectedToken ? (
          <>
            <div className="w-6 h-6 relative flex-shrink-0 bg-gray-800 rounded-full overflow-hidden">
              {selectedToken.logoURI ? (
                <Image
                  src={selectedToken.logoURI}
                  alt={selectedToken.symbol}
                  fill
                  sizes="24px"
                  className="rounded-full"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-sm font-medium text-gray-300">
                  {selectedToken.symbol.charAt(0)}
                </div>
              )}
            </div>
            <span className="font-medium truncate max-w-[100px]">
              {selectedToken.symbol}
            </span>
          </>
        ) : (
          <span className="font-medium">Select a token</span>
        )}
        <ChevronDownIcon className="h-4 w-4 text-gray-400" />
      </button>

      <EnhancedTokenSelector
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        onSelectToken={onTokenSelect}
        excludeAddresses={excludeAddresses}
        title={title}
        onlyMainTokens={onlyMainTokens}
        modalPosition={modalPosition}
      />
    </div>
  );
}
