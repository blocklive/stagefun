import React, { useState, useEffect, ChangeEvent } from "react";

interface TickerInputProps {
  value: string;
  onChange: (ticker: string) => void;
  className?: string;
}

export default function TickerInput({
  value,
  onChange,
  className = "",
}: TickerInputProps) {
  const [ticker, setTicker] = useState("");

  // Initialize with provided ticker
  useEffect(() => {
    if (value && !ticker) {
      setTicker(value);
    }
  }, [value, ticker]);

  // Handle ticker change
  const handleTickerChange = (e: ChangeEvent<HTMLInputElement>) => {
    const newTicker = e.target.value;
    setTicker(newTicker);
    onChange(newTicker);
  };

  return (
    <div className={className}>
      <div className="flex items-center bg-[#FFFFFF14] rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-[#836EF9]">
        <span className="px-4 py-4 text-gray-400 bg-gray-700 border-r border-gray-600">
          $
        </span>
        <input
          id="poolTicker"
          type="text"
          value={ticker}
          onChange={handleTickerChange}
          placeholder="Ticker"
          className="w-full p-4 bg-transparent text-white placeholder-gray-400 focus:outline-none"
        />
      </div>
    </div>
  );
}
