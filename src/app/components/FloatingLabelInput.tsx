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

// Format numeric value to preserve decimal input correctly
const formatCurrencyValue = (value: string): string => {
  // If empty, return as is
  if (!value) return value;

  // If it's just a decimal point, return it
  if (value === ".") return value;

  // If the value contains a decimal point, we need to carefully handle it
  if (value.includes(".")) {
    // If the value ends with a decimal point or any zeros after a decimal point
    // preserve exactly as typed
    if (value.endsWith(".") || /\.\d*0+$/.test(value)) {
      return value;
    }

    // For other decimal values, we can use parseFloat
    const num = parseFloat(value);
    if (isNaN(num)) return "";
    return num.toString();
  }

  // For whole numbers
  if (isNaN(Number(value))) return "";
  const num = parseFloat(value);
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
