import React from "react";
import { useInvestmentTerms } from "@/hooks/useInvestmentTerms";
import { useInvestmentTemplates } from "@/hooks/useInvestmentTemplates";
import { TemplateSelector } from "./TemplateSelector";
import { RegulatoryFrameworkSelector } from "./RegulatoryFrameworkSelector";
import { ReturnTypeInputs } from "./ReturnTypeInputs";
import { InvestmentTerms, SecurityType } from "@/types/investment";
import { NumericInputWithButtons } from "@/app/components/NumericInputWithButtons";

interface InvestmentTermsSectionProps {
  onTermsChange: (terms: InvestmentTerms) => void;
  onEnhancementsChange?: (enhancements: any) => void;
}

export const InvestmentTermsSection: React.FC<InvestmentTermsSectionProps> = ({
  onTermsChange,
  onEnhancementsChange,
}) => {
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
          Set the expected returns and structure for your investors
        </p>
      </div>

      <div className="space-y-8">
        {/* Template Selection */}
        <div>
          <h3 className="text-lg font-semibold text-white mb-4">
            Choose a Template
          </h3>
          <TemplateSelector
            selectedTemplateId={selectedTemplate?.id || null}
            onTemplateSelect={handleTemplateSelect}
          />
        </div>

        {/* Return Type Configuration */}
        {terms.returnType && (
          <div className="bg-[#FFFFFF0A] rounded-lg p-6 border border-gray-600/30">
            <h3 className="text-lg font-semibold text-white mb-4">
              Investment Details
            </h3>
            <ReturnTypeInputs terms={terms} onTermUpdate={updateTermsField} />
          </div>
        )}

        {/* Regulatory Framework */}
        <div className="bg-[#FFFFFF0A] rounded-lg p-6 border border-gray-600/30">
          <h3 className="text-lg font-semibold text-white mb-4">
            Regulatory Framework
          </h3>
          <RegulatoryFrameworkSelector
            selectedFramework={terms.regulatoryFramework}
            onFrameworkChange={(framework) =>
              updateTermsField("regulatoryFramework", framework)
            }
            onSecurityTypeChange={(securityType) =>
              updateTermsField("securityType", securityType as SecurityType)
            }
          />
        </div>

        {/* Additional Terms */}
        <div className="bg-[#FFFFFF0A] rounded-lg p-6 border border-gray-600/30">
          <h3 className="text-lg font-semibold text-white mb-4">
            Additional Terms
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Investment Horizon */}
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

            {/* Minimum Hold Period */}
            <NumericInputWithButtons
              label="Minimum Hold Period (months)"
              value={terms.minimumHoldPeriodMonths}
              onChange={(value) =>
                updateTermsField(
                  "minimumHoldPeriodMonths",
                  parseInt(value) || 0
                )
              }
              placeholder="6"
              min={0}
              step={1}
            />

            {/* Management Fee */}
            <NumericInputWithButtons
              label="Management Fee (%)"
              value={terms.managementFeePercentage}
              onChange={(value) =>
                updateTermsField(
                  "managementFeePercentage",
                  parseFloat(value) || 0
                )
              }
              placeholder="2.0"
              min={0}
              step={0.1}
              suffix="%"
            />

            {/* Performance Fee */}
            <NumericInputWithButtons
              label="Performance Fee (%)"
              value={terms.performanceFeePercentage}
              onChange={(value) =>
                updateTermsField(
                  "performanceFeePercentage",
                  parseFloat(value) || 0
                )
              }
              placeholder="20.0"
              min={0}
              step={0.1}
              suffix="%"
            />
          </div>
        </div>

        {/* Legal Disclaimer */}
        <div className="bg-amber-900/20 border border-amber-600/30 rounded-lg p-4">
          <p className="text-xs text-amber-200">
            <strong>Disclaimer:</strong> Investment offerings are subject to
            regulatory approval and compliance requirements. These projections
            are estimates only and not guarantees of future performance. All
            investments carry risk, including potential loss of principal.
          </p>
        </div>
      </div>
    </div>
  );
};
