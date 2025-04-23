import React from "react";

interface CustomButtonProps {
  onClick?: () => void;
  className?: string;
  disabled?: boolean;
  children: React.ReactNode;
  fullWidth?: boolean;
}

const CustomButton: React.FC<CustomButtonProps> = ({
  onClick,
  className = "",
  disabled = false,
  children,
  fullWidth = false,
}) => {
  const baseStyles =
    "py-4 bg-[#836EF9] hover:bg-[#7058E8] rounded-full text-white font-medium text-lg transition-colors flex items-center justify-center";

  // Combine the base styles with any additional classes
  const combinedStyles = `${baseStyles} ${fullWidth ? "w-full" : ""} ${
    disabled
      ? "opacity-60 cursor-not-allowed pointer-events-none"
      : "cursor-pointer"
  } ${className}`;

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
    >
      {children}
    </div>
  );
};

export default CustomButton;
