import React from "react";

interface CustomButtonProps {
  onClick?: (e?: React.MouseEvent<HTMLDivElement>) => void;
  className?: string;
  disabled?: boolean;
  children: React.ReactNode;
  fullWidth?: boolean;
  type?: "button" | "submit" | "reset";
}

const CustomButton: React.FC<CustomButtonProps> = ({
  onClick,
  className = "",
  disabled = false,
  children,
  fullWidth = false,
  type = "button",
}) => {
  const baseStyles =
    "py-4 bg-[#836EF9] hover:bg-[#7058E8] rounded-full text-white font-medium text-lg transition-colors flex items-center justify-center";

  // Combine the base styles with any additional classes
  const combinedStyles = `${baseStyles} ${fullWidth ? "w-full" : ""} ${
    disabled
      ? "opacity-60 cursor-not-allowed pointer-events-none"
      : "cursor-pointer"
  } ${className}`;

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (disabled) return;

    // Prevent form submission if this is not a submit button
    if (type !== "submit") {
      e.preventDefault();
    }

    // Call the onClick handler with the event
    onClick?.(e);
  };

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
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      className={combinedStyles}
      aria-disabled={disabled}
      data-button-type={type}
    >
      {children}
    </div>
  );
};

export default CustomButton;
