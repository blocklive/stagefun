"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { FaPlus, FaDollarSign, FaArrowLeft, FaUser } from "react-icons/fa";
import { BiInfoCircle } from "react-icons/bi";
import Image from "next/image";
import PointsButton from "./PointsButton";
import ResponsiveButton from "./ResponsiveButton";

interface AppHeaderProps {
  showBackButton?: boolean;
  showCreateButton?: boolean;
  showGetTokensButton?: boolean;
  showPointsButton?: boolean;
  showRightButtons?: boolean;
  showInfoButton?: boolean;
  showLogo?: boolean;
  onGetTokensClick?: () => void;
  onInfoClick?: () => void;
  onBackClick?: () => void;
  onPointsClick?: () => void;
  title?: string;
  showTitle?: boolean;
  className?: string;
  backgroundColor?: string;
  renderBackButton?: boolean;
  isAuthenticated?: boolean;
}

export default function AppHeader({
  showBackButton = false,
  showCreateButton = false,
  showGetTokensButton = false,
  showPointsButton = true,
  showRightButtons = false,
  showInfoButton = true,
  showLogo = true,
  onGetTokensClick,
  onInfoClick,
  onBackClick,
  onPointsClick,
  title = "POOLS",
  showTitle = true,
  className = "",
  backgroundColor = "transparent",
  renderBackButton = true,
  isAuthenticated = true,
}: AppHeaderProps) {
  const router = useRouter();

  return (
    <div className={`md:pl-64 ${className}`} style={{ backgroundColor }}>
      {/* Header with Logo and Action Buttons */}
      <header className="flex justify-between items-center p-4">
        {/* Logo and Back Button */}
        <div className="flex items-center gap-3">
          {showLogo && (
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
          )}
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
          {/* Points Button - Only show when authenticated */}
          {showPointsButton && isAuthenticated && (
            <PointsButton onClick={onPointsClick} />
          )}

          {/* Info Button - Always visible */}
          {showInfoButton && (
            <ResponsiveButton
              icon={<BiInfoCircle className="text-white w-5 h-5" />}
              label="How it works"
              onClick={onInfoClick}
            />
          )}

          {showGetTokensButton && (
            <ResponsiveButton
              icon={
                <Image
                  src="/icons/ic-droop.svg"
                  alt="Get Tokens"
                  width={20}
                  height={20}
                />
              }
              label="Faucet"
              onClick={onGetTokensClick}
            />
          )}

          {/* Create button is always visible but has different behavior based on auth status */}
          {showCreateButton && (
            <ResponsiveButton
              icon={
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
              }
              label="Create pool"
              onClick={() =>
                isAuthenticated
                  ? router.push("/pools/create")
                  : router.push("/")
              }
            />
          )}
        </div>
      </header>

      {/* Title */}
      {showTitle && (
        <h1
          className="text-left text-5xl font-bold mt-2 mb-2 px-4"
          style={{ fontFamily: "'Impact', sans-serif" }}
        >
          {title}
        </h1>
      )}
    </div>
  );
}
