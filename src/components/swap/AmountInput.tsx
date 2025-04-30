import React from "react";

interface AmountInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
  disabled?: boolean;
  max?: string;
  className?: string;
  showMaxButton?: boolean;
  onMaxClick?: () => void;
}

export function AmountInput({
  value,
  onChange,
  placeholder = "0.0",
  label,
  disabled = false,
  max,
  className = "",
  showMaxButton = false,
  onMaxClick,
}: AmountInputProps) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;

    // Allow only numbers and one decimal point
    if (inputValue === "" || /^[0-9]*\.?[0-9]*$/.test(inputValue)) {
      onChange(inputValue);
    }
  };

  return (
    <div className={`w-full ${className}`}>
      {label && (
        <div className="flex justify-between items-center mb-1">
          <label className="text-sm text-gray-400">{label}</label>
          {max && (
            <div className="text-sm text-gray-400">
              Balance: <span className="font-medium">{max}</span>
            </div>
          )}
        </div>
      )}
      <div className="relative w-full">
        <input
          type="text"
          value={value}
          onChange={handleChange}
          placeholder={placeholder}
          disabled={disabled}
          className={`w-full px-3 py-2 text-xl bg-transparent border border-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-[#836ef9] ${
            disabled ? "cursor-not-allowed bg-gray-800" : ""
          }`}
          inputMode="decimal"
          autoComplete="off"
          autoCorrect="off"
          pattern="^[0-9]*[.,]?[0-9]*$"
        />
        {showMaxButton && onMaxClick && (
          <button
            type="button"
            className="absolute right-2 top-1/2 transform -translate-y-1/2 px-2 py-1 text-xs font-medium text-[#836ef9] bg-[#836ef9]/20 rounded-md hover:bg-[#836ef9]/30"
            onClick={onMaxClick}
            disabled={disabled}
          >
            MAX
          </button>
        )}
      </div>
    </div>
  );
}
