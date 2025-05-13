"use client";

import React, { useState } from "react";
import { FiSettings } from "react-icons/fi";
import SettingsModal from "./SettingsModal";

export default function SettingsButton() {
  const [showSettings, setShowSettings] = useState(false);

  const handleClose = () => {
    setShowSettings(false);
  };

  return (
    <>
      <button
        onClick={() => setShowSettings(true)}
        className="flex flex-col items-center"
        aria-label="Settings"
      >
        <div className="w-10 h-10 flex items-center justify-center bg-[#2A2640] hover:bg-[#3A3650] rounded-full text-white transition-colors mb-1">
          <FiSettings className="text-lg" />
        </div>
        <span className="text-xs text-gray-400">Settings</span>
      </button>

      <SettingsModal isOpen={showSettings} onClose={handleClose} />
    </>
  );
}
