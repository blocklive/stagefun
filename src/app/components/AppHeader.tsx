"use client";

import { useRouter } from "next/navigation";
import { FaPlus, FaDollarSign, FaArrowLeft } from "react-icons/fa";
import React, { useState } from "react";
import GetTokensModal from "./GetTokensModal";

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
        {/* Logo */}
        <div className="flex items-center">
          {showBackButton && renderBackButton && (
            <button
              onClick={() => router.back()}
              className="mr-4 text-gray-400 hover:text-white"
            >
              <FaArrowLeft />
            </button>
          )}
          <div className="w-10 h-10 bg-[#836EF9] rounded-lg rotate-45 flex items-center justify-center">
            <div className="w-6 h-6 bg-black rounded-md -rotate-45"></div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          {showGetTokensButton && (
            <button
              onClick={onGetTokensClick}
              className="w-10 h-10 bg-[#2A2640] rounded-full flex items-center justify-center"
            >
              <FaDollarSign className="text-white" />
            </button>
          )}
          {showCreateButton && (
            <button
              onClick={() => router.push("/pools/create")}
              className="w-10 h-10 bg-[#2A2640] rounded-full flex items-center justify-center"
            >
              <FaPlus className="text-white" />
            </button>
          )}
          {showRightButtons && (
            <>
              <button
                onClick={() => setShowTokensModal(true)}
                className="w-10 h-10 bg-[#2A2640] rounded-full flex items-center justify-center"
              >
                <FaDollarSign className="text-white" />
              </button>
              <button
                onClick={() => router.push("/pools/create")}
                className="w-10 h-10 bg-[#2A2640] rounded-full flex items-center justify-center"
              >
                <FaPlus className="text-white" />
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
