"use client";

import React, { useState, useEffect } from "react";
import { FiSettings } from "react-icons/fi";
import SettingsModal from "./SettingsModal";

// Flag to keep track of intentional modal close vs refresh close
let settingsModalWasOpen = false;

export default function SettingsButton() {
  const [showSettings, setShowSettings] = useState(false);

  // When component mounts, check if we should reopen the modal
  useEffect(() => {
    if (settingsModalWasOpen) {
      setShowSettings(true);
    }
  }, []);

  // When settings modal state changes, update our tracker
  useEffect(() => {
    if (showSettings) {
      settingsModalWasOpen = true;
    }
  }, [showSettings]);

  // Handle manual close - reset the tracker
  const handleClose = () => {
    settingsModalWasOpen = false;
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
