import { ChangeEvent } from "react";

interface NumberInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  min?: number;
  max?: number;
  step?: number;
  label?: string;
  className?: string;
}

export default function NumberInput({
  value,
  onChange,
  placeholder = "0",
  min,
  max,
  step = 1,
  label,
  className = "",
}: NumberInputProps) {
  const isInteger = step === 1;
  const decimalPlaces = isInteger ? 0 : 2;

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (
      value === "" ||
      (isInteger ? /^\d*$/.test(value) : /^\d*\.?\d*$/.test(value))
    ) {
      onChange(value);
    }
  };

  const increment = () => {
    const currentValue = parseFloat(value) || 0;
    const newValue = currentValue + step;
    if (max === undefined || newValue <= max) {
      onChange(newValue.toFixed(decimalPlaces));
    }
  };

  const decrement = () => {
    const currentValue = parseFloat(value) || 0;
    const newValue = currentValue - step;
    if (min === undefined || newValue >= min) {
      onChange(newValue.toFixed(decimalPlaces));
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
          value={value}
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
