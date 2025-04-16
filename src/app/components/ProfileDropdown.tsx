"use client";

import React, { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { usePrivy } from "@privy-io/react-auth";
import { FaUser, FaSignOutAlt } from "react-icons/fa";
import UserAvatar from "./UserAvatar";
import { User } from "@/lib/supabase";

interface ProfileDropdownProps {
  user: User | null;
  className?: string;
}

export default function ProfileDropdown({
  user,
  className = "",
}: ProfileDropdownProps) {
  const router = useRouter();
  const { logout } = usePrivy();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Handle clicks outside the dropdown to close it
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsDropdownOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handlePortfolioClick = () => {
    setIsDropdownOpen(false);
    router.push("/profile");
  };

  const handleSignOutClick = () => {
    setIsDropdownOpen(false);
    logout();
  };

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {/* Profile Button - Responsive version to match other buttons */}
      <button
        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
        className="flex items-center justify-center transition-colors bg-[#FFFFFF14] hover:bg-[#FFFFFF1A] rounded-full lg:rounded-[23px]"
        aria-label="Profile"
      >
        {/* Mobile view - circle */}
        <div className="lg:hidden w-11 h-11 flex items-center justify-center">
          {user ? (
            <UserAvatar user={user} size={36} />
          ) : (
            <FaUser className="text-white w-5 h-5" />
          )}
        </div>
        {/* Desktop view - match pill height */}
        <div className="hidden lg:flex items-center justify-center h-9 w-9 mx-0.5">
          {user ? (
            <UserAvatar user={user} size={32} />
          ) : (
            <FaUser className="text-white w-5 h-5" />
          )}
        </div>
      </button>

      {/* Dropdown Menu */}
      {isDropdownOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-[#1E1F25] border border-[#FFFFFF1A] rounded-lg shadow-lg z-50 overflow-hidden">
          <button
            onClick={handlePortfolioClick}
            className="w-full px-4 py-3 text-left flex items-center hover:bg-[#FFFFFF14] transition-colors text-white"
          >
            <div className="w-5 h-5 mr-3 flex items-center justify-center text-[#836EF9]">
              <svg
                width="20"
                height="20"
                viewBox="0 0 28 28"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <rect
                  x="6"
                  y="6"
                  width="16"
                  height="16"
                  stroke="currentColor"
                  strokeWidth="2"
                />
                <path
                  d="M6 18L12 12L16 16L22 10"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <span>Portfolio</span>
          </button>
          <button
            onClick={handleSignOutClick}
            className="w-full px-4 py-3 text-left flex items-center hover:bg-[#FFFFFF14] transition-colors text-white"
          >
            <div className="w-5 h-5 mr-3 flex items-center justify-center text-[#836EF9]">
              <FaSignOutAlt size={16} />
            </div>
            <span>Sign Out</span>
          </button>
        </div>
      )}
    </div>
  );
}
