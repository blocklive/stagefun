import React, { useRef, useEffect } from "react";
import Image from "next/image";

interface SlippageSettingsProps {
  slippageTolerance: string;
  onChange: (value: string) => void;
  isAuto: boolean;
  setIsAuto: (isAuto: boolean) => void;
}

export function SlippageSettings({
  slippageTolerance,
  onChange,
  isAuto,
  setIsAuto,
}: SlippageSettingsProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  // When auto mode changes, focus the input if switching from auto to manual
  useEffect(() => {
    if (!isAuto && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isAuto]);

  const handleSlippageChange = (value: string) => {
    if (isAuto) {
      setIsAuto(false); // Turn off auto mode when user types
    }

    // Allow decimal input, including starting with a decimal point
    if (value === "" || /^\.?\d*\.?\d*$/.test(value)) {
      // If input starts with a decimal point, prepend a 0
      if (value.startsWith(".")) {
        value = "0" + value;
      }

      // Ensure only one decimal point
      const parts = value.split(".");
      if (parts.length > 2) {
        value = parts[0] + "." + parts.slice(1).join("");
      }

      // Check if the value is within range
      if (value === "" || parseFloat(value) <= 100) {
        onChange(value);
      }
    }
  };

  // When input is clicked, disable auto mode and focus the input
  const handleInputClick = () => {
    if (isAuto) {
      setIsAuto(false);
    }
  };

  // Enable auto mode when Auto button is clicked
  const handleAutoClick = () => {
    setIsAuto(true);
  };

  return (
    <div className="flex justify-between items-center text-sm">
      <div className="flex items-center">
        {/* Custom slippage icon */}
        <Image
          src="/icons/ic-slip.svg"
          alt="Slippage Icon"
          width={20}
          height={20}
          className="text-gray-400 mr-2 opacity-70"
        />
        <span className="text-gray-400 mr-4">Max slippage</span>
      </div>
      <div
        className="flex items-center rounded-lg overflow-hidden"
        style={{ backgroundColor: "rgba(255, 255, 255, 0.06)" }}
      >
        <button
          type="button"
          onClick={handleAutoClick}
          style={{
            backgroundColor: isAuto
              ? "rgba(255, 255, 255, 0.16)"
              : "transparent",
            color: isAuto ? "#FFFFFF" : "#9CA3AF",
            padding: "6px 14px 6px 16px",
            borderRadius: "8px",
            margin: "2px",
            fontSize: "14px",
            fontWeight: "500",
            transition: "all 0.2s",
          }}
        >
          Auto
        </button>
        <div
          className="flex items-center"
          style={{ paddingRight: "12px", paddingLeft: "4px" }}
        >
          <input
            ref={inputRef}
            type="text"
            value={isAuto ? "0.5" : slippageTolerance}
            onChange={(e) => handleSlippageChange(e.target.value)}
            onClick={handleInputClick}
            style={{
              width: "40px",
              textAlign: "right",
              backgroundColor: "transparent",
              border: "none",
              outline: "none",
              fontSize: "14px",
              cursor: "pointer",
              color: isAuto ? "#6B7280" : "#FFFFFF",
              padding: "0",
            }}
            readOnly={isAuto}
          />
          <span
            style={{ marginLeft: "2px", fontSize: "14px", color: "#9CA3AF" }}
          >
            %
          </span>
        </div>
      </div>
    </div>
  );
}
