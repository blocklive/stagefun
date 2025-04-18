import { ChangeEvent, useEffect, useState } from "react";
import { UINT256_MAX, isUncapped } from "@/lib/utils/contractValues";

interface EnhancedNumberInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  min?: number;
  max?: number;
  step?: number;
  label?: string;
  className?: string;
  hideMaxUint?: boolean; // Whether to hide max uint256 value
  maxUintDisplayValue?: string; // What to display instead of max uint256
}

export default function EnhancedNumberInput({
  value,
  onChange,
  placeholder = "0",
  min,
  max,
  step = 1,
  label,
  className = "",
  hideMaxUint = true,
  maxUintDisplayValue = "Unlimited",
}: EnhancedNumberInputProps) {
  const isInteger = step === 1;
  const decimalPlaces = isInteger ? 0 : 2;

  // Local display value state
  const [displayValue, setDisplayValue] = useState<string>(
    isUncapped(value) && hideMaxUint ? maxUintDisplayValue : value
  );

  // Update the display value when the actual value changes
  useEffect(() => {
    if (isUncapped(value) && hideMaxUint) {
      setDisplayValue(maxUintDisplayValue);
    } else {
      setDisplayValue(value);
    }
  }, [value, hideMaxUint, maxUintDisplayValue]);

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;

    // If the display value is maxUintDisplayValue and user starts typing, reset to empty
    if (
      displayValue === maxUintDisplayValue &&
      newValue !== maxUintDisplayValue
    ) {
      setDisplayValue("");
      onChange("");
      return;
    }

    // Normal validation logic
    if (
      newValue === "" ||
      newValue === "0" ||
      (isInteger ? /^\d*$/.test(newValue) : /^\d*\.?\d*$/.test(newValue))
    ) {
      setDisplayValue(newValue);
      onChange(newValue);
    }
  };

  const increment = () => {
    // If current value is uint256 max, do nothing
    if (isUncapped(value)) return;

    const currentValue = parseFloat(value) || 0;
    const newValue = currentValue + step;
    if (max === undefined || newValue <= max) {
      const formattedValue = newValue.toFixed(decimalPlaces);
      setDisplayValue(formattedValue);
      onChange(formattedValue);
    }
  };

  const decrement = () => {
    // If current value is uint256 max, set to a high but not unlimited value
    if (isUncapped(value)) {
      const newValue = "1000000";
      setDisplayValue(newValue);
      onChange(newValue);
      return;
    }

    const currentValue = parseFloat(value) || 0;
    const newValue = currentValue - step;
    if (min === undefined || newValue >= min) {
      const formattedValue = newValue.toFixed(decimalPlaces);
      setDisplayValue(formattedValue);
      onChange(formattedValue);
    }
  };

  return (
    <div className="relative">
      {label && (
        <label className="block text-gray-400 text-sm mb-2">{label}</label>
      )}
      <div className="relative">
        <input
          type="text"
          inputMode={isInteger ? "numeric" : "decimal"}
          pattern={isInteger ? "[0-9]*" : "[0-9]*\\.?[0-9]*"}
          value={displayValue}
          onChange={handleChange}
          placeholder={placeholder}
          className={`w-full h-[52px] pl-4 pr-[52px] bg-[#FFFFFF14] text-white rounded-[12px] border border-gray-700 focus:outline-none focus:ring-2 focus:ring-[#836EF9] ${className}`}
          style={{ appearance: "textfield" }}
        />
        <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex flex-col gap-[2px]">
          <button
            type="button"
            className="w-6 h-6 bg-[#FFFFFF14] hover:bg-[#FFFFFF1A] rounded-md flex items-center justify-center focus:outline-none transition-colors"
            onClick={increment}
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
            onClick={decrement}
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
      </div>
    </div>
  );
}
