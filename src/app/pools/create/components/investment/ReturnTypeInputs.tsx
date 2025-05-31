import React, { useState, useRef, useEffect } from "react";
import { ChevronDownIcon } from "@heroicons/react/24/outline";
import {
  InvestmentTerms,
  ReturnType,
  DistributionFrequency,
} from "@/types/investment";
import { NumericInputWithButtons } from "@/app/components/NumericInputWithButtons";

interface ReturnTypeInputsProps {
  terms: InvestmentTerms;
  onTermUpdate: <K extends keyof InvestmentTerms>(
    key: K,
    value: InvestmentTerms[K]
  ) => void;
}

interface DropdownOption {
  value: string;
  label: string;
}

const CustomDropdown: React.FC<{
  label: string;
  value: string;
  options: DropdownOption[];
  onChange: (value: string) => void;
  placeholder: string;
}> = ({ label, value, options, onChange, placeholder }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedOption = options.find((opt) => opt.value === value);
  const showLabel = value !== "";

  return (
    <div className="relative">
      <div
        className={`relative w-full h-16 rounded-lg overflow-hidden border transition-colors duration-200 bg-[#FFFFFF14] flex items-center cursor-pointer`}
        onClick={() => setIsOpen(!isOpen)}
        style={{
          borderColor: isOpen ? "#836EF9" : "transparent",
        }}
      >
        <div className="w-full h-full relative flex items-center">
          {/* Floating Label */}
          <span
            className={`absolute transition-all duration-200 pointer-events-none left-4 
              ${
                showLabel ? "top-2 text-xs" : "top-1/2 -translate-y-1/2 text-sm"
              }
              text-gray-400`}
          >
            {label}
          </span>

          {/* Selected Value */}
          <div
            className={`w-full h-full bg-transparent text-white focus:outline-none pl-4 pr-12 text-base flex items-center
              ${showLabel ? "pt-2" : "pt-0"}`}
          >
            {selectedOption?.label || ""}
          </div>

          {/* Chevron Icon */}
          <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
            <ChevronDownIcon
              className={`w-5 h-5 transition-transform ${
                isOpen ? "transform rotate-180" : ""
              }`}
            />
          </div>
        </div>
      </div>

      {/* Dropdown Options */}
      {isOpen && (
        <div className="absolute top-full left-0 mt-1 w-full bg-[#1E1F25] border border-[#FFFFFF1A] rounded-lg shadow-lg overflow-hidden z-20">
          <div className="max-h-48 overflow-y-auto">
            {options.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  onChange(option.value);
                  setIsOpen(false);
                }}
                className={`w-full p-3 text-left hover:bg-[#FFFFFF0A] transition-colors border-b border-[#FFFFFF1A] last:border-b-0 ${
                  value === option.value
                    ? "bg-[#836EF9]/10 text-[#836EF9]"
                    : "text-white"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export const ReturnTypeInputs: React.FC<ReturnTypeInputsProps> = ({
  terms,
  onTermUpdate,
}) => {
  const yieldMethodOptions: DropdownOption[] = [
    { value: "simple", label: "Simple Interest" },
    { value: "compound", label: "Compound Interest" },
    { value: "variable", label: "Variable Rate" },
  ];

  const frequencyOptions: DropdownOption[] = [
    { value: "monthly", label: "Monthly" },
    { value: "quarterly", label: "Quarterly" },
    { value: "annually", label: "Annually" },
    { value: "event_based", label: "Event-based" },
  ];

  const renderFixedYieldInputs = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <NumericInputWithButtons
        label="Fixed Yield (%)"
        value={terms.expectedAnnualYield}
        onChange={(value) =>
          onTermUpdate("expectedAnnualYield", parseFloat(value) || undefined)
        }
        placeholder="e.g. 8.5"
        min={0}
        max={100}
        step={0.1}
        suffix="%"
      />

      <CustomDropdown
        label="Distribution Frequency"
        value={terms.yieldDistributionFrequency || ""}
        options={frequencyOptions}
        onChange={(value) =>
          onTermUpdate(
            "yieldDistributionFrequency",
            value as DistributionFrequency
          )
        }
        placeholder="Select frequency"
      />
    </div>
  );

  const renderRevenueShareInputs = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <NumericInputWithButtons
        label="Revenue Share (%)"
        value={terms.revenueSharePercentage}
        onChange={(value) =>
          onTermUpdate("revenueSharePercentage", parseFloat(value) || undefined)
        }
        placeholder="e.g. 15"
        min={0}
        max={100}
        step={0.1}
        suffix="%"
      />

      <CustomDropdown
        label="Distribution Frequency"
        value={terms.revenueDistributionFrequency || ""}
        options={frequencyOptions}
        onChange={(value) =>
          onTermUpdate(
            "revenueDistributionFrequency",
            value as DistributionFrequency
          )
        }
        placeholder="Select frequency"
      />
    </div>
  );

  const renderProfitShareInputs = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <NumericInputWithButtons
        label="Profit Share (%)"
        value={terms.profitSharePercentage}
        onChange={(value) =>
          onTermUpdate("profitSharePercentage", parseFloat(value) || undefined)
        }
        placeholder="e.g. 20"
        min={0}
        max={100}
        step={0.1}
        suffix="%"
      />

      <CustomDropdown
        label="Distribution Frequency"
        value={terms.profitShareDistributionFrequency || ""}
        options={frequencyOptions}
        onChange={(value) =>
          onTermUpdate(
            "profitShareDistributionFrequency",
            value as DistributionFrequency
          )
        }
        placeholder="Select frequency"
      />
    </div>
  );

  const renderAppreciationInputs = () => (
    <div className="space-y-4">
      <div className="bg-[#FFFFFF0A] rounded-lg p-4 border border-gray-600/30">
        <h4 className="text-white font-medium mb-2">
          Asset Appreciation Investment
        </h4>
        <p className="text-sm text-gray-400">
          Investors will participate in the potential appreciation of the
          underlying asset or business. Returns are based on future value growth
          rather than fixed yields or revenue sharing.
        </p>
      </div>
      <div className="text-xs text-gray-500">
        <strong>Note:</strong> Appreciation investments do not guarantee
        specific returns. Value may increase, decrease, or remain unchanged
        based on market conditions and business performance.
      </div>
    </div>
  );

  const renderHybridInputs = () => (
    <div className="space-y-6">
      {/* Yield Component */}
      <div>
        <h4 className="text-white font-medium mb-4">Fixed Yield Component</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <NumericInputWithButtons
            label="Fixed Yield (%)"
            value={terms.expectedAnnualYield}
            onChange={(value) =>
              onTermUpdate(
                "expectedAnnualYield",
                parseFloat(value) || undefined
              )
            }
            placeholder="e.g. 8"
            min={0}
            max={100}
            step={0.1}
          />

          <CustomDropdown
            label="Distribution Frequency"
            value={terms.yieldDistributionFrequency || ""}
            options={frequencyOptions}
            onChange={(value) =>
              onTermUpdate(
                "yieldDistributionFrequency",
                value as DistributionFrequency
              )
            }
            placeholder="Select frequency"
          />
        </div>
      </div>

      {/* Revenue Share Component */}
      <div>
        <h4 className="text-white font-medium mb-4">Revenue Share Component</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <NumericInputWithButtons
            label="Revenue Share (%)"
            value={terms.revenueSharePercentage}
            onChange={(value) =>
              onTermUpdate(
                "revenueSharePercentage",
                parseFloat(value) || undefined
              )
            }
            placeholder="e.g. 15"
            min={0}
            max={100}
            step={0.1}
          />

          <CustomDropdown
            label="Distribution Frequency"
            value={terms.revenueDistributionFrequency || ""}
            options={frequencyOptions}
            onChange={(value) =>
              onTermUpdate(
                "revenueDistributionFrequency",
                value as DistributionFrequency
              )
            }
            placeholder="Select frequency"
          />
        </div>
      </div>

      {/* Profit Share Component */}
      <div>
        <h4 className="text-white font-medium mb-4">Profit Share Component</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <NumericInputWithButtons
            label="Profit Share (%)"
            value={terms.profitSharePercentage}
            onChange={(value) =>
              onTermUpdate(
                "profitSharePercentage",
                parseFloat(value) || undefined
              )
            }
            placeholder="e.g. 20"
            min={0}
            max={100}
            step={0.1}
          />

          <CustomDropdown
            label="Distribution Frequency"
            value={terms.profitShareDistributionFrequency || ""}
            options={frequencyOptions}
            onChange={(value) =>
              onTermUpdate(
                "profitShareDistributionFrequency",
                value as DistributionFrequency
              )
            }
            placeholder="Select frequency"
          />
        </div>
      </div>
    </div>
  );

  switch (terms.returnType) {
    case "fixed_yield":
      return renderFixedYieldInputs();
    case "revenue_share":
      return renderRevenueShareInputs();
    case "profit_share":
      return renderProfitShareInputs();
    case "appreciation":
      return renderAppreciationInputs();
    case "hybrid":
      return renderHybridInputs();
    default:
      return null;
  }
};
