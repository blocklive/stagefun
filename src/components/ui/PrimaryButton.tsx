import React, { ButtonHTMLAttributes } from "react";
import { LoadingSpinner } from "@/components/LoadingSpinner";

interface PrimaryButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  isLoading?: boolean;
  fullWidth?: boolean;
}

export const PrimaryButton: React.FC<PrimaryButtonProps> = ({
  children,
  isLoading = false,
  disabled = false,
  fullWidth = false,
  className = "",
  ...props
}) => {
  return (
    <button
      className={`text-white font-medium rounded-lg py-3 px-6 ${
        fullWidth ? "w-full" : ""
      } ${className}`}
      disabled={disabled || isLoading}
      style={{
        background: "linear-gradient(to right, #9b6dff, #836ef9)",
        border: "1px solid rgba(184, 159, 255, 0.3)",
        boxShadow: "0 4px 6px -1px rgba(128, 90, 213, 0.2)",
      }}
      {...props}
    >
      {isLoading ? (
        <div className="flex items-center justify-center">
          <LoadingSpinner color="#FFFFFF" size={16} />
          <span className="ml-2">{children}</span>
        </div>
      ) : (
        children
      )}
    </button>
  );
};
