import React, { useState, useRef } from "react";
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
  formatValue?: (value: string) => string;
  displayValue?: string;
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
  formatValue,
  displayValue,
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

  // Use displayValue if provided, or format the value if a formatter is provided
  const valueToDisplay =
    displayValue || (formatValue ? formatValue(value) : value);

  return (
    <div className={`relative ${className}`}>
      <div
        className="relative w-full h-16 rounded-lg overflow-hidden border transition-colors duration-200 bg-[#FFFFFF14] flex items-center"
        onClick={() => inputRef.current?.focus()}
        style={{
          borderColor: isFocused ? "#836EF9" : "transparent",
        }}
      >
        <div className="w-full h-full relative flex items-center">
          {/* Floating Label */}
          <span
            className={`absolute transition-all duration-200 pointer-events-none text-gray-400 
              ${leftIcon ? "left-12" : "left-4"} 
              ${
                showLabel ? "top-2 text-xs" : "top-1/2 -translate-y-1/2 text-sm"
              }`}
          >
            {placeholder}
            {required && <span className="text-red-500 ml-1">*</span>}
          </span>

          {/* Left Icon */}
          {leftIcon && (
            <div className="absolute left-4 top-1/2 transform -translate-y-1/2">
              {leftIcon}
            </div>
          )}

          {/* Input Field */}
          <input
            ref={inputRef}
            type={type}
            value={valueToDisplay}
            onChange={handleChange}
            onFocus={handleFocus}
            onBlur={handleBlur}
            min={min}
            step={step}
            inputMode={inputMode}
            pattern={pattern}
            className={`w-full h-full bg-transparent text-white focus:outline-none
              ${leftIcon ? "pl-12" : "pl-4"}
              ${showLabel ? "pt-2" : "pt-0"}
              pr-4 text-base`}
            style={{ appearance: "textfield" }}
          />

          {/* Right Elements */}
          {rightElements && (
            <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
              {rightElements}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Format numeric value to remove trailing zeros after decimal point
const formatCurrencyValue = (value: string): string => {
  // If empty or not a number, return as is
  if (!value || isNaN(Number(value))) return value;

  // Parse the value to handle different formats
  const num = parseFloat(value);

  // If it's a whole number, return without decimal places
  if (Number.isInteger(num)) return num.toString();

  // Otherwise, return the value with necessary decimal places
  return num.toString();
};

// For convenience, create a specific version for USDC inputs
export const USDCInput: React.FC<
  Omit<FloatingLabelInputProps, "leftIcon" | "formatValue">
> = (props) => {
  const usdcIcon = (
    <Image src="/images/usdc-logo.svg" alt="USDC" width={24} height={24} />
  );

  // Get the display value with proper formatting
  const displayValue = formatCurrencyValue(props.value);

  return (
    <FloatingLabelInput
      {...props}
      leftIcon={usdcIcon}
      inputMode="decimal"
      pattern="[0-9]*\.?[0-9]*"
      type="text"
      displayValue={displayValue}
    />
  );
};

export default FloatingLabelInput;
