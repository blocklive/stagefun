import React from "react";
import { TemplateCard } from "./TemplateCard";
import { useInvestmentTemplates } from "@/hooks/useInvestmentTemplates";

interface TemplateSelectorProps {
  selectedTemplateId: string | null;
  onTemplateSelect: (templateId: string) => void;
}

export const TemplateSelector: React.FC<TemplateSelectorProps> = ({
  selectedTemplateId,
  onTemplateSelect,
}) => {
  const { templates } = useInvestmentTemplates();

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold text-white mb-2">
          Start with an Investment Template
        </h3>
        <p className="text-sm text-gray-400 mb-4">
          Select a template to get started, then customize as needed
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {templates.map((template) => (
          <TemplateCard
            key={template.id}
            template={template}
            isSelected={selectedTemplateId === template.id}
            onClick={() => onTemplateSelect(template.id)}
          />
        ))}
      </div>
    </div>
  );
};
