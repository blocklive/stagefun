"use client";

import React, { ReactNode } from "react";

interface ResponsiveButtonProps {
  icon: ReactNode;
  label: string;
  onClick?: () => void;
  className?: string;
}

export default function ResponsiveButton({
  icon,
  label,
  onClick,
  className = "",
}: ResponsiveButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center justify-center transition-colors bg-[#FFFFFF14] hover:bg-[#FFFFFF1A] rounded-[23px] ${className}`}
    >
      <div className="lg:hidden w-11 h-11 flex items-center justify-center">
        {icon}
      </div>
      <div className="hidden lg:flex items-center gap-2 px-4 py-2">
        {icon}
        <span className="text-white text-sm">{label}</span>
      </div>
    </button>
  );
}
