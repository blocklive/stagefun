"use client";

import React, { useState, useRef, useEffect } from "react";
import { FaInfoCircle } from "react-icons/fa";

interface TooltipProps {
  text: string;
  position?: "top" | "bottom" | "left" | "right";
  width?: string;
  icon?: React.ReactNode;
}

export default function Tooltip({
  text,
  position = "top",
  width = "250px",
  icon = <FaInfoCircle className="text-gray-400 hover:text-gray-300" />,
}: TooltipProps) {
  const [showTooltip, setShowTooltip] = useState(false);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const iconRef = useRef<HTMLDivElement>(null);

  // Position styles
  const getPositionStyles = () => {
    switch (position) {
      case "top":
        return {
          bottom: "100%",
          left: "50%",
          transform: "translateX(-50%) translateY(-8px)",
        };
      case "bottom":
        return {
          top: "100%",
          left: "50%",
          transform: "translateX(-50%) translateY(8px)",
        };
      case "left":
        return {
          top: "50%",
          right: "100%",
          transform: "translateY(-50%) translateX(-8px)",
        };
      case "right":
        return {
          top: "50%",
          left: "100%",
          transform: "translateY(-50%) translateX(8px)",
        };
      default:
        return {};
    }
  };

  // Handle click outside to close tooltip
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        tooltipRef.current &&
        !tooltipRef.current.contains(event.target as Node) &&
        iconRef.current &&
        !iconRef.current.contains(event.target as Node)
      ) {
        setShowTooltip(false);
      }
    }

    if (showTooltip) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showTooltip]);

  // Handle both mouseenter/leave for desktop and click for mobile
  const handleMouseEnter = () => {
    // Only use hover on desktop devices
    if (window.matchMedia("(min-width: 768px)").matches) {
      setShowTooltip(true);
    }
  };

  const handleMouseLeave = () => {
    // Only use hover on desktop devices
    if (window.matchMedia("(min-width: 768px)").matches) {
      setShowTooltip(false);
    }
  };

  const handleClick = () => {
    setShowTooltip(!showTooltip);
  };

  return (
    <div className="relative inline-block">
      <div
        ref={iconRef}
        onClick={handleClick}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className="cursor-pointer"
      >
        {icon}
      </div>

      {showTooltip && (
        <div
          ref={tooltipRef}
          className="absolute z-50 px-3 py-2 text-sm text-white bg-[#1A1B1F] border border-[#2C2C2E] rounded-md shadow-lg"
          style={{
            ...getPositionStyles(),
            width,
            lineHeight: "1.5",
            letterSpacing: "0.01em",
            fontSmooth: "always",
            WebkitFontSmoothing: "antialiased",
            MozOsxFontSmoothing: "grayscale",
          }}
        >
          {text}
        </div>
      )}
    </div>
  );
}
