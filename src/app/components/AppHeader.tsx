"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { FaPlus, FaDollarSign, FaArrowLeft } from "react-icons/fa";
import { BiInfoCircle } from "react-icons/bi";
import Image from "next/image";
import PointsButton from "./PointsButton";

interface AppHeaderProps {
  showBackButton?: boolean;
  showCreateButton?: boolean;
  showGetTokensButton?: boolean;
  showPointsButton?: boolean;
  showRightButtons?: boolean;
  showInfoButton?: boolean;
  onGetTokensClick?: () => void;
  onInfoClick?: () => void;
  onBackClick?: () => void;
  onPointsClick?: () => void;
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
  showPointsButton = true,
  showRightButtons = false,
  showInfoButton = true,
  onGetTokensClick,
  onInfoClick,
  onBackClick,
  onPointsClick,
  title = "POOLS",
  showTitle = true,
  className = "",
  backgroundColor = "transparent",
  renderBackButton = true,
}: AppHeaderProps) {
  const router = useRouter();

  return (
    <div className={`${className}`} style={{ backgroundColor }}>
      {/* Header with Logo and Action Buttons */}
      <header className="flex justify-between items-center p-4">
        {/* Logo and Back Button */}
        <div className="flex items-center gap-3">
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
          {showBackButton && (
            <button
              onClick={onBackClick || (() => router.back())}
              className="w-10 h-10 bg-[#FFFFFF14] hover:bg-[#FFFFFF1A] rounded-full flex items-center justify-center transition-colors"
            >
              <FaArrowLeft className="text-white w-5 h-5" />
            </button>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 items-center">
          {/* Points Button */}
          {showPointsButton && <PointsButton onClick={onPointsClick} />}

          {/* Info Button - Always visible */}
          {showInfoButton && (
            <button
              onClick={onInfoClick}
              className="w-10 h-10 bg-[#FFFFFF14] hover:bg-[#FFFFFF1A] rounded-full flex items-center justify-center transition-colors"
            >
              <BiInfoCircle className="text-white w-5 h-5" />
            </button>
          )}

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
    </div>
  );
}
