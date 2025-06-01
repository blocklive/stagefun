import React from "react";

interface InvestmentInfoBoxProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  className?: string;
}

export default function InvestmentInfoBox({
  icon,
  label,
  value,
  className = "",
}: InvestmentInfoBoxProps) {
  return (
    <div
      className={`bg-[#FFFFFF0A] rounded-xl p-4 flex items-center space-x-3 ${className}`}
    >
      <div className="flex-shrink-0">{icon}</div>
      <div className="flex-1 min-w-0">
        <div className="text-sm text-gray-400">{label}</div>
        <div className="text-white font-medium break-words">{value}</div>
      </div>
    </div>
  );
}
