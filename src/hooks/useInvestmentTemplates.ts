import { useState, useCallback } from "react";
import { InvestmentTemplate } from "@/types/investment";
import { INVESTMENT_TEMPLATES } from "@/lib/constants/investment";

export interface UseInvestmentTemplatesResult {
  templates: InvestmentTemplate[];
  selectedTemplate: InvestmentTemplate | null;
  selectTemplate: (templateId: string) => InvestmentTemplate | null;
  clearSelection: () => void;
  getTemplateById: (templateId: string) => InvestmentTemplate | undefined;
}

export function useInvestmentTemplates(): UseInvestmentTemplatesResult {
  const [selectedTemplate, setSelectedTemplate] =
    useState<InvestmentTemplate | null>(null);

  const selectTemplate = useCallback(
    (templateId: string): InvestmentTemplate | null => {
      const template = INVESTMENT_TEMPLATES.find((t) => t.id === templateId);
      if (template) {
        setSelectedTemplate(template);
        return template;
      }
      return null;
    },
    []
  );

  const clearSelection = useCallback(() => {
    setSelectedTemplate(null);
  }, []);

  const getTemplateById = useCallback(
    (templateId: string): InvestmentTemplate | undefined => {
      return INVESTMENT_TEMPLATES.find((t) => t.id === templateId);
    },
    []
  );

  return {
    templates: INVESTMENT_TEMPLATES,
    selectedTemplate,
    selectTemplate,
    clearSelection,
    getTemplateById,
  };
}
