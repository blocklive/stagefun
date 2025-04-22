import React from "react";

interface TabButtonProps {
  label: string;
  isActive: boolean;
  onClick: () => void;
}

export const TabButton: React.FC<TabButtonProps> = ({
  label,
  isActive,
  onClick,
}) => {
  return (
    <button
      onClick={onClick}
      className={`min-w-[120px] px-6 h-[36px] flex items-center justify-center rounded-full text-center transition-colors ${
        isActive
          ? "bg-[#2a2a2a] text-white border border-[#333333]"
          : "bg-[#1a1a1a] text-gray-400 hover:text-gray-300"
      }`}
    >
      {label}
    </button>
  );
};

export default TabButton;
