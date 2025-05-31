import React, { useState, useRef } from "react";

interface NumericInputWithButtonsProps {
  value: string | number | undefined;
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
  min?: number;
  max?: number;
  step?: number;
  disabled?: boolean;
  className?: string;
  suffix?: string; // e.g., "%", "months"
}

export const NumericInputWithButtons: React.FC<
  NumericInputWithButtonsProps
> = ({
  value,
  onChange,
  placeholder = "0",
  label,
  min = 0,
  max,
  step = 0.1,
  disabled = false,
  className = "",
  suffix,
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Convert value to string for input
  const stringValue = value?.toString() || "";

  // Whether to show the label at the top (when focused or has value)
  const showLabel = isFocused || stringValue !== "";

  // Use label if provided, otherwise fallback to placeholder
  const displayLabel = label || placeholder;

  const handleFocus = () => {
    if (disabled) return;
    setIsFocused(true);
  };

  const handleBlur = () => {
    setIsFocused(false);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (disabled) return;
    onChange(e.target.value);
  };

  // Create increment/decrement buttons (just like createIncrementalButtons)
  const createIncrementalButtons = () => {
    if (disabled) {
      return (
        <div className="flex flex-col gap-1 opacity-60">
          <div className="w-6 h-6 bg-[#FFFFFF14] rounded-md flex items-center justify-center cursor-not-allowed">
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M18 15L12 9L6 15"
                stroke="gray"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <div className="w-6 h-6 bg-[#FFFFFF14] rounded-md flex items-center justify-center cursor-not-allowed">
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M6 9L12 15L18 9"
                stroke="gray"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        </div>
      );
    }

    return (
      <div className="flex flex-col gap-1">
        <button
          type="button"
          className="w-6 h-6 bg-[#FFFFFF14] hover:bg-[#FFFFFF1A] rounded-md flex items-center justify-center focus:outline-none transition-colors"
          onClick={() => {
            const currentValue = parseFloat(stringValue) || 0;
            const newValue = currentValue + step;
            if (max === undefined || newValue <= max) {
              onChange(newValue.toString());
            }
          }}
        >
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M18 15L12 9L6 15"
              stroke="white"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
        <button
          type="button"
          className="w-6 h-6 bg-[#FFFFFF14] hover:bg-[#FFFFFF1A] rounded-md flex items-center justify-center focus:outline-none transition-colors"
          onClick={() => {
            const currentValue = parseFloat(stringValue) || 0;
            const newValue = currentValue - step;
            if (newValue >= min) {
              onChange(newValue.toString());
            }
          }}
        >
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M6 9L12 15L18 9"
              stroke="white"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>
    );
  };

  return (
    <div className={className}>
      <div className="relative">
        <div
          className={`relative w-full h-16 rounded-lg overflow-hidden border transition-colors duration-200 bg-[#FFFFFF14] flex items-center 
            ${disabled ? "opacity-70 pointer-events-none" : "cursor-text"}`}
          onClick={() => {
            if (!disabled && inputRef.current) {
              inputRef.current.focus();
            }
          }}
          style={{
            borderColor: isFocused && !disabled ? "#836EF9" : "transparent",
          }}
        >
          <div className="w-full h-full relative flex items-center">
            {/* Floating Label */}
            <span
              className={`absolute transition-all duration-200 pointer-events-none left-4 
                ${
                  showLabel
                    ? "top-2 text-xs"
                    : "top-1/2 -translate-y-1/2 text-sm"
                }
                ${disabled ? "text-gray-500" : "text-gray-400"}`}
            >
              {displayLabel}
            </span>

            {/* Input Field */}
            <input
              ref={inputRef}
              type="number"
              step={step}
              min={min}
              max={max}
              value={stringValue}
              onChange={handleChange}
              onFocus={handleFocus}
              onBlur={handleBlur}
              className={`w-full h-full bg-transparent text-white focus:outline-none pl-4 pr-4 text-base
                ${showLabel ? "pt-2" : "pt-0"}
                ${disabled ? "cursor-not-allowed text-gray-400" : ""}
                [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none`}
              disabled={disabled}
              aria-disabled={disabled}
              readOnly={disabled}
              tabIndex={disabled ? -1 : undefined}
            />

            {/* Right Elements (Buttons) */}
            <div
              className={`absolute right-4 top-1/2 transform -translate-y-1/2 ${
                disabled ? "opacity-60 pointer-events-none" : ""
              }`}
            >
              {createIncrementalButtons()}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
