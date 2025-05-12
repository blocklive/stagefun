"use client";

import React from "react";
import { useAlphaMode } from "@/hooks/useAlphaMode";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const { isAlphaMode, isLoading, toggleAlphaMode } = useAlphaMode();

  if (!isOpen) return null;

  const handleToggleAlpha = async () => {
    await toggleAlphaMode();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-70">
      <div className="relative w-full max-w-md bg-[#1A1A25] rounded-xl overflow-hidden shadow-lg px-6 py-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-white">Settings</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white focus:outline-none"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M6 18L18 6M6 6l12 12"
              ></path>
            </svg>
          </button>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between py-3 border-b border-gray-700">
            <div>
              <h3 className="font-medium text-white">Alpha Mode</h3>
              <p className="text-sm text-gray-400">
                Enable experimental features
              </p>
            </div>
            <div className="relative">
              <button
                disabled={isLoading}
                onClick={handleToggleAlpha}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-[#836EF9] focus:ring-offset-2 focus:ring-offset-black ${
                  isAlphaMode ? "bg-[#836EF9]" : "bg-gray-700"
                } ${isLoading ? "opacity-70" : ""}`}
                aria-label="Toggle Alpha Mode"
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    isAlphaMode ? "translate-x-6" : "translate-x-1"
                  } ${isLoading ? "animate-pulse" : ""}`}
                />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
