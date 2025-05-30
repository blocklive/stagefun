import React from "react";
import { InvestmentTerms, RiskLevel } from "@/types/investment";
import { useInvestmentTerms } from "@/hooks/useInvestmentTerms";
import { TemplateSelector } from "./investment/TemplateSelector";
import { RegulatoryFrameworkSelector } from "./investment/RegulatoryFrameworkSelector";
import { ReturnTypeInputs } from "./investment/ReturnTypeInputs";
import { RISK_LEVEL_INFO } from "@/lib/constants/investment";

interface InvestmentTermsSectionProps {
  terms: InvestmentTerms;
  onTermsChange: (terms: InvestmentTerms) => void;
}

export const InvestmentTermsSection: React.FC<InvestmentTermsSectionProps> = ({
  terms,
  onTermsChange,
}) => {
  const {
    selectedTemplate,
    updateTerm,
    applyTemplate,
    isValid,
    validationErrors,
  } = useInvestmentTerms(terms);

  const handleTemplateSelect = (templateId: string) => {
    applyTemplate(templateId);
    // Get the updated terms from the hook's internal state
    setTimeout(() => {
      onTermsChange({ ...terms });
    }, 0);
  };

  const handleTermUpdate = <K extends keyof InvestmentTerms>(
    key: K,
    value: InvestmentTerms[K]
  ) => {
    updateTerm(key, value);
    onTermsChange({ ...terms, [key]: value });
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-white mb-2">Investment Terms</h2>
        <p className="text-gray-400">
          Define the investment structure and expected returns for your pool
        </p>
      </div>

      {/* Template Selection */}
      <TemplateSelector
        selectedTemplateId={selectedTemplate}
        onTemplateSelect={handleTemplateSelect}
      />

      {/* Regulatory Framework */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-white">
          Regulatory Compliance
        </h3>
        <RegulatoryFrameworkSelector
          selectedFramework={terms.regulatoryFramework}
          selectedSecurityType={terms.securityType}
          onFrameworkChange={(framework) =>
            handleTermUpdate("regulatoryFramework", framework)
          }
          onSecurityTypeChange={(securityType) =>
            handleTermUpdate("securityType", securityType as any)
          }
        />
      </div>

      {/* Return Structure */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-white">Return Structure</h3>
        <ReturnTypeInputs terms={terms} onTermUpdate={handleTermUpdate} />
      </div>

      {/* Risk & Investment Horizon */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-white">Risk & Timeline</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">
              Risk Level
            </label>
            <select
              value={terms.riskLevel}
              onChange={(e) =>
                handleTermUpdate("riskLevel", e.target.value as RiskLevel)
              }
              className="w-full p-3 bg-[#FFFFFF0A] border border-gray-600 rounded-lg text-white focus:border-[#836EF9] focus:outline-none"
            >
              {Object.entries(RISK_LEVEL_INFO).map(([key, info]) => (
                <option key={key} value={key}>
                  {info.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">
              Investment Horizon (months)
            </label>
            <input
              type="number"
              min="1"
              value={terms.investmentHorizonMonths}
              onChange={(e) =>
                handleTermUpdate(
                  "investmentHorizonMonths",
                  parseInt(e.target.value) || 1
                )
              }
              className="w-full p-3 bg-[#FFFFFF0A] border border-gray-600 rounded-lg text-white focus:border-[#836EF9] focus:outline-none"
              placeholder="e.g. 12"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">
              Minimum Hold Period (months)
            </label>
            <input
              type="number"
              min="0"
              value={terms.minimumHoldPeriodMonths || ""}
              onChange={(e) =>
                handleTermUpdate(
                  "minimumHoldPeriodMonths",
                  parseInt(e.target.value) || undefined
                )
              }
              className="w-full p-3 bg-[#FFFFFF0A] border border-gray-600 rounded-lg text-white focus:border-[#836EF9] focus:outline-none"
              placeholder="Optional"
            />
          </div>
        </div>
      </div>

      {/* Management Fees */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-white">Fee Structure</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">
              Management Fee (%)
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              max="10"
              value={terms.managementFeePercentage || ""}
              onChange={(e) =>
                handleTermUpdate(
                  "managementFeePercentage",
                  parseFloat(e.target.value) || undefined
                )
              }
              className="w-full p-3 bg-[#FFFFFF0A] border border-gray-600 rounded-lg text-white focus:border-[#836EF9] focus:outline-none"
              placeholder="e.g. 2.0"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">
              Performance Fee (%)
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              max="50"
              value={terms.performanceFeePercentage || ""}
              onChange={(e) =>
                handleTermUpdate(
                  "performanceFeePercentage",
                  parseFloat(e.target.value) || undefined
                )
              }
              className="w-full p-3 bg-[#FFFFFF0A] border border-gray-600 rounded-lg text-white focus:border-[#836EF9] focus:outline-none"
              placeholder="e.g. 20.0"
            />
          </div>
        </div>
      </div>

      {/* Track Record */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-white">Track Record</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">
              Experience Level
            </label>
            <select
              value={terms.trackRecord || ""}
              onChange={(e) =>
                handleTermUpdate("trackRecord", e.target.value as any)
              }
              className="w-full p-3 bg-[#FFFFFF0A] border border-gray-600 rounded-lg text-white focus:border-[#836EF9] focus:outline-none"
            >
              <option value="">Select experience</option>
              <option value="first_time">First-time project</option>
              <option value="some_experience">Some similar experience</option>
              <option value="proven_track_record">Proven track record</option>
            </select>
          </div>

          {(terms.trackRecord === "some_experience" ||
            terms.trackRecord === "proven_track_record") && (
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Similar Projects Completed
              </label>
              <input
                type="number"
                min="0"
                value={terms.similarProjectsCount || ""}
                onChange={(e) =>
                  handleTermUpdate(
                    "similarProjectsCount",
                    parseInt(e.target.value) || undefined
                  )
                }
                className="w-full p-3 bg-[#FFFFFF0A] border border-gray-600 rounded-lg text-white focus:border-[#836EF9] focus:outline-none"
                placeholder="e.g. 5"
              />
            </div>
          )}
        </div>

        {terms.trackRecord !== "first_time" && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Average Returns Achieved
              </label>
              <input
                type="text"
                value={terms.averageReturnsDescription || ""}
                onChange={(e) =>
                  handleTermUpdate("averageReturnsDescription", e.target.value)
                }
                className="w-full p-3 bg-[#FFFFFF0A] border border-gray-600 rounded-lg text-white focus:border-[#836EF9] focus:outline-none"
                placeholder="e.g. 10-15% annually"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Notable Successes
              </label>
              <textarea
                value={terms.notableSuccesses || ""}
                onChange={(e) =>
                  handleTermUpdate("notableSuccesses", e.target.value)
                }
                rows={3}
                className="w-full p-3 bg-[#FFFFFF0A] border border-gray-600 rounded-lg text-white focus:border-[#836EF9] focus:outline-none resize-none"
                placeholder="Brief description of past successful projects..."
              />
            </div>
          </div>
        )}
      </div>

      {/* Validation Errors */}
      {!isValid && validationErrors.length > 0 && (
        <div className="p-4 bg-red-900/30 border border-red-600 rounded-lg">
          <h4 className="font-semibold text-red-400 mb-2">
            Please fix the following:
          </h4>
          <ul className="list-disc list-inside space-y-1 text-sm text-red-300">
            {validationErrors.map((error, index) => (
              <li key={index}>{error}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Legal Disclaimer */}
      <div className="p-4 bg-yellow-900/20 border border-yellow-600 rounded-lg">
        <h4 className="font-semibold text-yellow-400 mb-2">
          ⚠️ Important Legal Disclaimer
        </h4>
        <ul className="list-disc list-inside space-y-1 text-sm text-yellow-300">
          <li>Investment returns are projections and not guaranteed</li>
          <li>Past performance does not predict future results</li>
          <li>All investments carry risk of loss</li>
          <li>This is not financial or investment advice</li>
          <li>
            Consult with qualified professionals before making investment
            decisions
          </li>
        </ul>
      </div>
    </div>
  );
};
