import React from "react";
import { useInvestmentTerms } from "@/hooks/useInvestmentTerms";
import { useInvestmentTemplates } from "@/hooks/useInvestmentTemplates";
import { TemplateSelector } from "./TemplateSelector";
import { RegulatoryFrameworkSelector } from "./RegulatoryFrameworkSelector";
import { ReturnTypeInputs } from "./ReturnTypeInputs";
import { InvestmentTerms, SecurityType, ReturnType } from "@/types/investment";
import { NumericInputWithButtons } from "@/app/components/NumericInputWithButtons";
import { RETURN_TYPE_INFO } from "@/lib/constants/investment";
import { ChevronDownIcon } from "@heroicons/react/24/outline";

interface InvestmentTermsSectionProps {
  onTermsChange: (terms: InvestmentTerms) => void;
  onEnhancementsChange?: (enhancements: any) => void;
}

// Return Type Dropdown Component
const ReturnTypeDropdown: React.FC<{
  value: ReturnType | undefined;
  onChange: (value: ReturnType) => void;
}> = ({ value, onChange }) => {
  const [isOpen, setIsOpen] = React.useState(false);
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
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

  const selectedOption = value ? RETURN_TYPE_INFO[value] : null;
  const showLabel = value !== undefined;

  return (
    <div className="relative" ref={dropdownRef}>
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
            Return Type
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
            {Object.entries(RETURN_TYPE_INFO).map(([key, info]) => (
              <button
                key={key}
                type="button"
                onClick={() => {
                  onChange(key as ReturnType);
                  setIsOpen(false);
                }}
                className={`w-full p-3 text-left hover:bg-[#FFFFFF0A] transition-colors border-b border-[#FFFFFF1A] last:border-b-0 ${
                  value === key
                    ? "bg-[#836EF9]/10 text-[#836EF9]"
                    : "text-white"
                }`}
              >
                <div className="font-medium">{info.label}</div>
                <div className="text-sm text-gray-400">{info.description}</div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export const InvestmentTermsSection: React.FC<InvestmentTermsSectionProps> = ({
  onTermsChange,
  onEnhancementsChange,
}) => {
  const [showAdvancedSettings, setShowAdvancedSettings] = React.useState(false);

  const {
    terms,
    enhancements,
    updateTermsField,
    updateEnhancement,
    applyTemplate,
    validate,
    isValid,
  } = useInvestmentTerms();

  const { templates, selectedTemplate, selectTemplate } =
    useInvestmentTemplates();

  React.useEffect(() => {
    onTermsChange(terms);
  }, [terms, onTermsChange]);

  React.useEffect(() => {
    if (onEnhancementsChange) {
      onEnhancementsChange(enhancements);
    }
  }, [enhancements, onEnhancementsChange]);

  React.useEffect(() => {
    // Set default fees to 0
    if (terms.managementFeePercentage === undefined) {
      updateTermsField("managementFeePercentage", 0);
    }
    if (terms.performanceFeePercentage === undefined) {
      updateTermsField("performanceFeePercentage", 0);
    }
  }, []);

  const handleTemplateSelect = (templateId: string) => {
    selectTemplate(templateId);
    const template = templates.find((t) => t.id === templateId);
    if (template) {
      applyTemplate(template);
    }
  };

  return (
    <div className="mb-8">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-white mb-2">Investment Terms</h2>
        <p className="text-gray-400 text-sm">
          Launch your ICO to raise funding while offering investors tradable
          tokens with real returns. Set how your token holders will earn back
          from your project's success - whether through fixed yields, revenue
          sharing, or asset appreciation. Your tokens become tradable
          representations of the underlying investment opportunity.
        </p>
      </div>

      <div className="space-y-8">
        {/* Template Selection */}
        <div>
          <TemplateSelector
            selectedTemplateId={selectedTemplate?.id || null}
            onTemplateSelect={handleTemplateSelect}
          />
        </div>

        {/* Investment Details - Combined Container */}
        <div className="bg-[#FFFFFF0A] rounded-lg p-6 border border-gray-600/30">
          <h3 className="text-lg font-semibold text-white mb-6">
            Investment Details
          </h3>

          {/* Return Type Selection */}
          <div className="mb-6">
            <ReturnTypeDropdown
              value={terms.returnType}
              onChange={(returnType) =>
                updateTermsField("returnType", returnType)
              }
            />
          </div>

          {/* Return Type Configuration */}
          {terms.returnType && (
            <div className="mb-6">
              <ReturnTypeInputs terms={terms} onTermUpdate={updateTermsField} />
            </div>
          )}

          {/* Investment Horizon */}
          <div>
            <NumericInputWithButtons
              label="Investment Horizon (months)"
              value={terms.investmentHorizonMonths}
              onChange={(value) =>
                updateTermsField(
                  "investmentHorizonMonths",
                  parseInt(value) || 0
                )
              }
              placeholder="12"
              min={0}
              step={1}
            />
          </div>
        </div>

        {/* Advanced Settings - Collapsible Container */}
        <div className="bg-[#FFFFFF0A] rounded-lg border border-gray-600/30">
          <button
            type="button"
            onClick={() => setShowAdvancedSettings(!showAdvancedSettings)}
            className="w-full p-6 flex items-center justify-between text-left focus:outline-none"
          >
            <div>
              <h3 className="text-lg font-semibold text-white">
                Advanced Settings
              </h3>
              <p className="text-gray-400 text-sm mt-1">
                Regulatory compliance and fee structure (optional)
              </p>
            </div>
            <ChevronDownIcon
              className={`w-5 h-5 text-gray-400 transition-transform ${
                showAdvancedSettings ? "transform rotate-180" : ""
              }`}
            />
          </button>

          {showAdvancedSettings && (
            <div className="px-6 pb-6 space-y-6">
              {/* Regulatory Framework */}
              <div>
                <RegulatoryFrameworkSelector
                  selectedFramework={terms.regulatoryFramework}
                  selectedSecurityType={terms.securityType}
                  onFrameworkChange={(framework) =>
                    updateTermsField("regulatoryFramework", framework)
                  }
                  onSecurityTypeChange={(securityType) =>
                    updateTermsField(
                      "securityType",
                      securityType as SecurityType
                    )
                  }
                />
              </div>

              {/* Fee Structure */}
              <div>
                <h4 className="text-md font-medium text-white mb-4">
                  Fee Structure
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Management Fee */}
                  <NumericInputWithButtons
                    label="Management Fee (%)"
                    value={terms.managementFeePercentage || 0}
                    onChange={(value) =>
                      updateTermsField(
                        "managementFeePercentage",
                        parseFloat(value) || 0
                      )
                    }
                    placeholder="0"
                    min={0}
                    step={0.1}
                  />

                  {/* Performance Fee */}
                  <NumericInputWithButtons
                    label="Performance Fee (%)"
                    value={terms.performanceFeePercentage || 0}
                    onChange={(value) =>
                      updateTermsField(
                        "performanceFeePercentage",
                        parseFloat(value) || 0
                      )
                    }
                    placeholder="0"
                    min={0}
                    step={0.1}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
