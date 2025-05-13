import React, { useEffect } from "react";

interface AmountInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
  disabled?: boolean;
  max?: string;
  className?: string;
}

export function AmountInput({
  value,
  onChange,
  placeholder = "0.0",
  label,
  disabled = false,
  max,
  className = "",
}: AmountInputProps) {
  // Limit display value to 8 decimal places
  useEffect(() => {
    console.log("value", value);
    if (value.includes(".")) {
      const parts = value.split(".");
      if (parts[1] && parts[1].length > 8) {
        // Format to 8 decimal places for display
        const newValue = `${parts[0]}.${parts[1].substring(0, 8)}`;
        console.log("newValue", newValue);
        onChange(newValue);
      }
    }
  }, [value, onChange]);

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
          className={`w-full pl-0 pr-3 py-2 text-xl bg-transparent border-none text-white rounded-lg focus:outline-none ${
            disabled ? "cursor-not-allowed bg-gray-800/30" : ""
          }`}
          inputMode="decimal"
          autoComplete="off"
          autoCorrect="off"
          pattern="^[0-9]*[.,]?[0-9]*$"
        />
      </div>
    </div>
  );
}
