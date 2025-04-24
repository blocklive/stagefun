import React from "react";

interface SelectorButtonProps {
  onClick?: () => void;
  className?: string;
  disabled?: boolean;
  children: React.ReactNode;
  isActive?: boolean;
}

const SelectorButton: React.FC<SelectorButtonProps> = ({
  onClick,
  className = "",
  disabled = false,
  children,
  isActive = false,
}) => {
  // Base styles from TierDetailsForm buttons
  const baseStyles =
    "flex-1 px-4 py-2 rounded-lg flex items-center justify-center";

  // Active/inactive styles from TierDetailsForm
  const stateStyles = isActive
    ? "bg-[#836EF9] text-white"
    : "bg-[#FFFFFF14] text-gray-300 hover:bg-[#FFFFFF24]";

  // Disabled styles from TierDetailsForm
  const disabledStyles = disabled
    ? "opacity-60 cursor-not-allowed pointer-events-none border-transparent"
    : "";

  // Combine all styles
  const combinedStyles = `${baseStyles} ${stateStyles} ${disabledStyles} transition-colors ${className}`;

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Handle keyboard accessibility - activate on Enter or Space
    if (!disabled && (e.key === "Enter" || e.key === " ")) {
      e.preventDefault();
      onClick?.();
    }
  };

  return (
    <div
      role="button"
      tabIndex={disabled ? -1 : 0}
      onClick={disabled ? undefined : onClick}
      onKeyDown={handleKeyDown}
      className={combinedStyles}
      aria-disabled={disabled}
      aria-pressed={isActive}
    >
      {children}
    </div>
  );
};

export default SelectorButton;
