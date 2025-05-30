import React from "react";
import { InvestmentTemplate } from "@/types/investment";
import { RISK_LEVEL_INFO } from "@/lib/constants/investment";

interface TemplateCardProps {
  template: InvestmentTemplate;
  isSelected: boolean;
  onClick: () => void;
}

export const TemplateCard: React.FC<TemplateCardProps> = ({
  template,
  isSelected,
  onClick,
}) => {
  const riskInfo = RISK_LEVEL_INFO[template.terms.riskLevel!];

  return (
    <button
      type="button"
      onClick={onClick}
      className={`
        relative p-4 rounded-lg transition-all duration-200 text-left w-full group
        ${
          isSelected
            ? "bg-[#836EF9]/10 border border-[#836EF9] shadow-lg shadow-[#836EF9]/10"
            : "bg-[#FFFFFF0A] border border-gray-600/30 hover:border-gray-500/50 hover:bg-[#FFFFFF14]"
        }
      `}
    >
      {/* Selection indicator */}
      {isSelected && (
        <div className="absolute top-3 right-3 w-5 h-5 bg-[#836EF9] rounded-full flex items-center justify-center">
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            className="text-white"
          >
            <path
              d="M9 12L11 14L15 10"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      )}

      <div className="flex items-center gap-3 mb-3">
        <div className="w-8 h-8 flex items-center justify-center">
          <template.icon className="w-6 h-6 text-[#836EF9]" />
        </div>
        <div>
          <h3 className="font-semibold text-white text-sm">{template.name}</h3>
          <p className="text-xs text-gray-400 mt-0.5">{template.description}</p>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span
            className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${riskInfo.bgColor} ${riskInfo.color}`}
          >
            {riskInfo.label}
          </span>

          <div className="text-right">
            {template.terms.returnType === "fixed_yield" &&
              template.terms.expectedAnnualYield && (
                <div className="text-xs text-gray-300 font-medium">
                  {template.terms.expectedAnnualYield}%{" "}
                  <span className="text-gray-500">yield</span>
                </div>
              )}
            {template.terms.returnType === "revenue_share" &&
              template.terms.revenueSharePercentage && (
                <div className="text-xs text-gray-300 font-medium">
                  {template.terms.revenueSharePercentage}%{" "}
                  <span className="text-gray-500">revenue</span>
                </div>
              )}
            {template.terms.returnType === "appreciation" &&
              template.terms.projectedAppreciationPercentage && (
                <div className="text-xs text-gray-300 font-medium">
                  {template.terms.projectedAppreciationPercentage}%{" "}
                  <span className="text-gray-500">growth</span>
                </div>
              )}
            {template.terms.returnType === "hybrid" && (
              <div className="text-xs text-gray-300 font-medium">
                <span className="text-gray-500">hybrid</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </button>
  );
};
