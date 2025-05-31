import { useState, useCallback } from "react";
import {
  InvestmentTerms,
  TierInvestmentEnhancement,
  InvestmentTemplate,
} from "@/types/investment";
import { INVESTMENT_TEMPLATES } from "@/lib/constants/investment";

export interface UseInvestmentTermsResult {
  terms: InvestmentTerms;
  enhancements: TierInvestmentEnhancement;
  selectedTemplate: string | null;
  setTerms: (terms: InvestmentTerms) => void;
  updateTermsField: <K extends keyof InvestmentTerms>(
    key: K,
    value: InvestmentTerms[K]
  ) => void;
  updateEnhancement: <K extends keyof TierInvestmentEnhancement>(
    key: K,
    value: TierInvestmentEnhancement[K]
  ) => void;
  applyTemplate: (template: InvestmentTemplate) => void;
  resetTerms: () => void;
  validate: () => boolean;
  isValid: boolean;
  validationErrors: string[];
}

const defaultTerms: InvestmentTerms = {
  returnType: "fixed_yield",
  riskLevel: "medium",
  investmentHorizonMonths: 12,
  managementFeePercentage: 0,
};

const defaultEnhancements: TierInvestmentEnhancement = {
  tierId: "",
  poolId: "",
  yieldBonusPercentage: 0,
  feeDiscountPercentage: 0,
  earlyAccess: false,
  votingRights: false,
  enhancedRewards: false,
};

export function useInvestmentTerms(
  initialTerms?: Partial<InvestmentTerms>
): UseInvestmentTermsResult {
  const [terms, setTerms] = useState<InvestmentTerms>({
    ...defaultTerms,
    ...initialTerms,
  });
  const [enhancements, setEnhancements] =
    useState<TierInvestmentEnhancement>(defaultEnhancements);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);

  const updateTermsField = useCallback(
    <K extends keyof InvestmentTerms>(key: K, value: InvestmentTerms[K]) => {
      setTerms((prev) => ({ ...prev, [key]: value }));
    },
    []
  );

  const updateEnhancement = useCallback(
    <K extends keyof TierInvestmentEnhancement>(
      key: K,
      value: TierInvestmentEnhancement[K]
    ) => {
      setEnhancements((prev) => ({ ...prev, [key]: value }));
    },
    []
  );

  const applyTemplate = useCallback((template: InvestmentTemplate) => {
    setTerms((prev) => ({
      ...prev,
      ...template.terms,
    }));
    setSelectedTemplate(template.id);
  }, []);

  const resetTerms = useCallback(() => {
    setTerms(defaultTerms);
    setEnhancements(defaultEnhancements);
    setSelectedTemplate(null);
  }, []);

  // Validation logic
  const validationErrors: string[] = [];

  if (!terms.returnType) {
    validationErrors.push("Return type is required");
  }

  if (!terms.riskLevel) {
    validationErrors.push("Risk level is required");
  }

  if (!terms.investmentHorizonMonths || terms.investmentHorizonMonths <= 0) {
    validationErrors.push("Investment horizon must be greater than 0");
  }

  // Return type specific validations
  if (
    terms.returnType === "fixed_yield" &&
    (!terms.expectedAnnualYield || terms.expectedAnnualYield <= 0)
  ) {
    validationErrors.push(
      "Expected annual yield is required for fixed yield investments"
    );
  }

  if (
    terms.returnType === "revenue_share" &&
    (!terms.revenueSharePercentage || terms.revenueSharePercentage <= 0)
  ) {
    validationErrors.push(
      "Revenue share percentage is required for revenue share investments"
    );
  }

  if (
    terms.returnType === "appreciation" &&
    (!terms.projectedAppreciationPercentage ||
      terms.projectedAppreciationPercentage <= 0)
  ) {
    validationErrors.push(
      "Projected appreciation is required for appreciation investments"
    );
  }

  const isValid = validationErrors.length === 0;

  const validate = useCallback(() => {
    return isValid;
  }, [isValid]);

  return {
    terms,
    enhancements,
    selectedTemplate,
    setTerms,
    updateTermsField,
    updateEnhancement,
    applyTemplate,
    resetTerms,
    validate,
    isValid,
    validationErrors,
  };
}
