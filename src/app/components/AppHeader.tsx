"use client";

import { useRouter } from "next/navigation";
import { FaPlus, FaDollarSign, FaArrowLeft } from "react-icons/fa";
import React, { useState } from "react";
import GetTokensModal from "./GetTokensModal";
import Image from "next/image";

interface AppHeaderProps {
  showBackButton?: boolean;
  showCreateButton?: boolean;
  showGetTokensButton?: boolean;
  showRightButtons?: boolean;
  onGetTokensClick?: () => void;
  title?: string;
  showTitle?: boolean;
  className?: string;
  backgroundColor?: string;
  renderBackButton?: boolean;
}

export default function AppHeader({
  showBackButton = false,
  showCreateButton = false,
  showGetTokensButton = false,
  showRightButtons = false,
  onGetTokensClick,
  title = "POOLS",
  showTitle = true,
  className = "",
  backgroundColor = "transparent",
  renderBackButton = true,
}: AppHeaderProps) {
  const router = useRouter();
  const [showTokensModal, setShowTokensModal] = useState(false);

  return (
    <div className={`${className}`} style={{ backgroundColor }}>
      {/* Header with Logo and Action Buttons */}
      <header className="flex justify-between items-center p-4">
        {/* Logo - Only visible on mobile */}
        <div className="flex items-center">
          <div
            className="h-10 md:hidden cursor-pointer"
            onClick={() => router.push("/pools")}
          >
            <Image
              src="/stagefunheader.png"
              alt="StageFun Logo"
              width={40}
              height={40}
              className="object-contain"
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          {showGetTokensButton && (
            <button
              onClick={onGetTokensClick}
              className="w-10 h-10 bg-[#FFFFFF14] hover:bg-[#FFFFFF1A] rounded-full flex items-center justify-center transition-colors"
            >
              <Image
                src="/icons/ic-droop.svg"
                alt="Get Tokens"
                width={20}
                height={20}
              />
            </button>
          )}
          {showCreateButton && (
            <button
              onClick={() => router.push("/pools/create")}
              className="w-10 h-10 bg-[#FFFFFF14] hover:bg-[#FFFFFF1A] rounded-full flex items-center justify-center transition-colors"
            >
              <svg
                className="w-5 h-5 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                width="20"
                height="20"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="1.5"
                  d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                />
              </svg>
            </button>
          )}
          {showRightButtons && (
            <>
              <button
                onClick={() => setShowTokensModal(true)}
                className="w-10 h-10 bg-[#FFFFFF14] hover:bg-[#FFFFFF1A] rounded-full flex items-center justify-center transition-colors"
              >
                <Image
                  src="/icons/ic-droop.svg"
                  alt="Get Tokens"
                  width={20}
                  height={20}
                />
              </button>
              <button
                onClick={() => router.push("/pools/create")}
                className="w-10 h-10 bg-[#FFFFFF14] hover:bg-[#FFFFFF1A] rounded-full flex items-center justify-center transition-colors"
              >
                <svg
                  className="w-5 h-5 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  width="20"
                  height="20"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="1.5"
                    d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                  />
                </svg>
              </button>
            </>
          )}
        </div>
      </header>

      {/* Title */}
      {showTitle && (
        <h1
          className="text-center text-5xl font-bold mt-2 mb-6"
          style={{ fontFamily: "'Impact', sans-serif" }}
        >
          {title}
        </h1>
      )}

      {/* Get Tokens Modal */}
      <GetTokensModal
        isOpen={showTokensModal}
        onClose={() => setShowTokensModal(false)}
      />
    </div>
  );
}
