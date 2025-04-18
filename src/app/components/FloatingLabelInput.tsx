import React, { useState, useRef, useEffect } from "react";
import Image from "next/image";

interface FloatingLabelInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  type?: string;
  min?: number;
  step?: number;
  inputMode?:
    | "text"
    | "numeric"
    | "decimal"
    | "email"
    | "tel"
    | "url"
    | "search"
    | "none";
  pattern?: string;
  leftIcon?: React.ReactNode;
  rightElements?: React.ReactNode;
  className?: string;
  required?: boolean;
  onBlur?: () => void;
  onFocus?: () => void;
}

const FloatingLabelInput: React.FC<FloatingLabelInputProps> = ({
  value,
  onChange,
  placeholder,
  type = "text",
  min,
  step,
  inputMode,
  pattern,
  leftIcon,
  rightElements,
  className = "",
  required = false,
  onBlur,
  onFocus,
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFocus = () => {
    setIsFocused(true);
    if (onFocus) onFocus();
  };

  const handleBlur = () => {
    setIsFocused(false);
    if (onBlur) onBlur();
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
  };

  // Whether to show the label at the top (when focused or has value)
  const showLabel = isFocused || value !== "";

  return (
    <div className={`relative ${className}`}>
      <div
        className={`relative w-full rounded-lg overflow-hidden transition-all duration-200 border ${
          isFocused ? "border-[#836EF9]" : "border-transparent"
        } bg-[#FFFFFF14] ${showLabel ? "pt-6 pb-2" : "py-4"}`}
        onClick={() => inputRef.current?.focus()}
      >
        {/* Floating Label */}
        <span
          className={`absolute left-0 transition-all duration-200 pointer-events-none ${
            leftIcon ? "left-16" : "left-4"
          } ${
            showLabel
              ? "transform -translate-y-3 text-xs text-gray-400"
              : "transform translate-y-0 text-base text-gray-400"
          }`}
        >
          {placeholder}
          {required && <span className="text-red-500 ml-1">*</span>}
        </span>

        {/* Left Icon (if provided) */}
        {leftIcon && (
          <div className="absolute left-4 top-1/2 transform -translate-y-1/2">
            {leftIcon}
          </div>
        )}

        {/* Input Field */}
        <input
          ref={inputRef}
          type={type}
          value={value}
          onChange={handleChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          min={min}
          step={step}
          inputMode={inputMode}
          pattern={pattern}
          className={`w-full h-full bg-transparent text-white focus:outline-none ${
            leftIcon ? "pl-16" : "pl-4"
          } ${showLabel ? "pt-3 pb-1" : "py-0"}`}
          style={{ appearance: "textfield" }}
        />

        {/* Right Elements (if provided) */}
        {rightElements && (
          <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
            {rightElements}
          </div>
        )}
      </div>
    </div>
  );
};

// For convenience, create a specific version for USDC inputs
export const USDCInput: React.FC<Omit<FloatingLabelInputProps, "leftIcon">> = (
  props
) => {
  const usdcIcon = (
    <Image src="/images/usdc-logo.svg" alt="USDC" width={24} height={24} />
  );

  return (
    <FloatingLabelInput
      {...props}
      leftIcon={usdcIcon}
      inputMode="decimal"
      pattern="[0-9]*\.?[0-9]*"
      type="text"
    />
  );
};

export default FloatingLabelInput;
