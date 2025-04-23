import React, { ReactNode } from "react";

interface TabButtonProps {
  label: string;
  isActive: boolean;
  onClick: () => void;
  showIndicator?: boolean;
}

export const TabButton: React.FC<TabButtonProps> = ({
  label,
  isActive,
  onClick,
  showIndicator = false,
}) => {
  return (
    <button
      onClick={onClick}
      className={`px-4 h-9 rounded-xl text-base font-medium ${
        isActive
          ? "bg-[#FFFFFF1F] border border-[#FFFFFF29] text-white"
          : "bg-[#FFFFFF0F] text-gray-400 hover:text-gray-200"
      }`}
    >
      <div className="flex items-center">
        {label}
        {showIndicator && (
          <span className="ml-2 w-2 h-2 rounded-full bg-orange-500"></span>
        )}
      </div>
    </button>
  );
};

export default TabButton;
