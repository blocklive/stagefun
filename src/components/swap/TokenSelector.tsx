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

        // Calculate position to center the modal on the swap container
        setModalPosition({
          left: swapRect.left,
          top: Math.max(20, swapRect.top + window.scrollY - 80), // Position above the swap UI but not too high
          width: swapRect.width,
        });
      } else {
        // Fallback if we can't find the swap container
        const rect = containerRef.current.getBoundingClientRect();
        const viewportWidth = window.innerWidth;

        setModalPosition({
          left: Math.max(0, (viewportWidth - 450) / 2), // Center horizontally with 450px max width
          top: Math.max(20, rect.top + window.scrollY - 300), // Position above the button
          width: Math.min(450, viewportWidth - 40), // Respect viewport width with padding
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
            <div className="w-6 h-6 relative">
              <Image
                src={selectedToken.logoURI || "/icons/generic-token.svg"}
                alt={selectedToken.symbol}
                fill
                sizes="24px"
                className="rounded-full"
              />
            </div>
            <span className="font-medium">{selectedToken.symbol}</span>
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
