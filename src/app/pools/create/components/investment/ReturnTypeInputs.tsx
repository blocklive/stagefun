import React, { useState, useRef, useEffect } from "react";
import { ChevronDownIcon } from "@heroicons/react/24/outline";
import {
  InvestmentTerms,
  ReturnType,
  YieldCalculationMethod,
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
        label="Expected Annual Yield (%)"
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
        label="Calculation Method"
        value={terms.yieldCalculationMethod || ""}
        options={yieldMethodOptions}
        onChange={(value) =>
          onTermUpdate(
            "yieldCalculationMethod",
            value as YieldCalculationMethod
          )
        }
        placeholder="Select method"
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

  const renderAppreciationInputs = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <NumericInputWithButtons
        label="Projected Appreciation (%)"
        value={terms.projectedAppreciationPercentage}
        onChange={(value) =>
          onTermUpdate(
            "projectedAppreciationPercentage",
            parseFloat(value) || undefined
          )
        }
        placeholder="e.g. 25"
        min={0}
        step={0.1}
        suffix="%"
      />

      <NumericInputWithButtons
        label="Appreciation Timeframe (months)"
        value={terms.appreciationTimeframeMonths}
        onChange={(value) =>
          onTermUpdate(
            "appreciationTimeframeMonths",
            parseInt(value) || undefined
          )
        }
        placeholder="e.g. 36"
        min={1}
        step={1}
      />
    </div>
  );

  const renderHybridInputs = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <NumericInputWithButtons
          label="Annual Yield (%)"
          value={terms.expectedAnnualYield}
          onChange={(value) =>
            onTermUpdate("expectedAnnualYield", parseFloat(value) || undefined)
          }
          placeholder="e.g. 8"
          min={0}
          max={100}
          step={0.1}
          suffix="%"
        />

        <NumericInputWithButtons
          label="Appreciation (%)"
          value={terms.projectedAppreciationPercentage}
          onChange={(value) =>
            onTermUpdate(
              "projectedAppreciationPercentage",
              parseFloat(value) || undefined
            )
          }
          placeholder="e.g. 5"
          min={0}
          step={0.1}
          suffix="%"
        />
      </div>
    </div>
  );

  switch (terms.returnType) {
    case "fixed_yield":
      return renderFixedYieldInputs();
    case "revenue_share":
      return renderRevenueShareInputs();
    case "appreciation":
      return renderAppreciationInputs();
    case "hybrid":
      return renderHybridInputs();
    default:
      return null;
  }
};
