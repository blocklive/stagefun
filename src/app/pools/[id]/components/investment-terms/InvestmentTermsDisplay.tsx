import React from "react";
import { useInvestmentTermsDisplay } from "../../../../../hooks/useInvestmentTermsDisplay";
import InvestmentInfoBox from "./InvestmentInfoBox";
import {
  FiBarChart,
  FiCheckCircle,
  FiCalendar,
  FiAlertTriangle,
} from "react-icons/fi";

interface InvestmentTermsDisplayProps {
  poolId: string;
}

export default function InvestmentTermsDisplay({
  poolId,
}: InvestmentTermsDisplayProps) {
  const {
    terms,
    isLoading,
    error,
    formattedReturn,
    riskLevel,
    projectedDate,
    isVerifiedProducer,
  } = useInvestmentTermsDisplay(poolId);

  // Don't render if no terms or still loading
  if (isLoading || !terms || error) {
    return null;
  }

  const infoBoxes = [];

  // Return Type - Show this first
  if (terms.return_type) {
    const returnTypeLabel = (() => {
      switch (terms.return_type) {
        case "fixed_yield":
          return "Fixed Yield";
        case "revenue_share":
          return "Revenue Share";
        case "royalty":
          return "Royalty";
        case "appreciation":
          return "Token Allocation";
        case "hybrid":
          return "Hybrid Returns";
        default:
          return "Investment Type";
      }
    })();

    infoBoxes.push({
      id: "return-type",
      icon: <FiBarChart className="w-6 h-6 text-[#836EF9]" />,
      label: "Return type",
      value: returnTypeLabel,
    });
  }

  // Concrete percentage returns - only show real percentages, not guesses
  if (terms.return_type === "fixed_yield" && terms.expected_annual_yield) {
    infoBoxes.push({
      id: "yield",
      icon: <FiBarChart className="w-6 h-6 text-[#836EF9]" />,
      label: "Annual yield",
      value: `${terms.expected_annual_yield}%`,
    });
  }

  if (terms.return_type === "revenue_share" && terms.revenue_share_percentage) {
    infoBoxes.push({
      id: "revenue",
      icon: <FiBarChart className="w-6 h-6 text-[#836EF9]" />,
      label: "Revenue share",
      value: `${terms.revenue_share_percentage}%`,
    });
  }

  if (terms.return_type === "royalty" && terms.royalty_percentage) {
    infoBoxes.push({
      id: "royalty",
      icon: <FiBarChart className="w-6 h-6 text-[#836EF9]" />,
      label: "Royalty",
      value: `${terms.royalty_percentage}%`,
    });
  }

  // Skip showing appreciation percentage since it's speculative

  // Verified Producer status
  if (isVerifiedProducer) {
    infoBoxes.push({
      id: "verified",
      icon: <FiCheckCircle className="w-6 h-6 text-[#836EF9]" />,
      label: "Verified producer",
      value: "Track record",
    });
  }

  // Projected date
  if (projectedDate) {
    infoBoxes.push({
      id: "date",
      icon: <FiCalendar className="w-6 h-6 text-[#836EF9]" />,
      label: "Projected date",
      value: projectedDate,
    });
  }

  // Risk level
  if (riskLevel) {
    const riskColor = (() => {
      switch (terms.risk_level) {
        case "low":
          return "text-green-400";
        case "medium":
          return "text-yellow-400";
        case "high":
          return "text-orange-400";
        default:
          return "text-red-400";
      }
    })();

    infoBoxes.push({
      id: "risk",
      icon: <FiAlertTriangle className={`w-6 h-6 ${riskColor}`} />,
      label: "Risk level",
      value: riskLevel,
    });
  }

  // Don't render if no info boxes
  if (infoBoxes.length === 0) {
    return null;
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
      {infoBoxes.map((box) => (
        <InvestmentInfoBox
          key={box.id}
          icon={box.icon}
          label={box.label}
          value={box.value}
        />
      ))}
    </div>
  );
}
