import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { InvestmentTerms } from "../types/investment";

// Database response interface with snake_case field names
interface InvestmentTermsDB {
  id?: string;
  pool_id?: string;
  return_type: string;
  expected_annual_yield?: number;
  revenue_share_percentage?: number;
  royalty_percentage?: number;
  projected_appreciation_percentage?: number;
  risk_level: string;
  investment_horizon_months: number;
  track_record?: string;
  [key: string]: any; // Allow other database fields
}

interface InvestmentTermsDisplay {
  terms: InvestmentTermsDB | null;
  isLoading: boolean;
  error: string | null;
  formattedReturn: string;
  riskLevel: string;
  projectedDate: string | null;
  isVerifiedProducer: boolean;
}

export function useInvestmentTermsDisplay(
  poolId: string
): InvestmentTermsDisplay {
  const [terms, setTerms] = useState<InvestmentTermsDB | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchInvestmentTerms() {
      if (!poolId) return;

      try {
        setIsLoading(true);
        setError(null);

        const { data, error } = await supabase
          .from("pool_investment_terms")
          .select("*")
          .eq("pool_id", poolId)
          .single();

        if (error && error.code !== "PGRST116") {
          // PGRST116 is "not found" - that's okay
          throw error;
        }

        setTerms(data);
      } catch (err) {
        console.error("Error fetching investment terms:", err);
        setError(
          err instanceof Error
            ? err.message
            : "Failed to fetch investment terms"
        );
      } finally {
        setIsLoading(false);
      }
    }

    fetchInvestmentTerms();
  }, [poolId]);

  // Format return information based on return type
  const formattedReturn = (() => {
    if (!terms) return "";

    switch (terms.return_type) {
      case "fixed_yield":
        return `${terms.expected_annual_yield || 0}%`;
      case "revenue_share":
        return `${terms.revenue_share_percentage || 0}% revenue`;
      case "royalty":
        return `${terms.royalty_percentage || 0}% royalty`;
      case "appreciation":
        return `${terms.projected_appreciation_percentage || 0}% target`;
      case "hybrid":
        // Show the most prominent return component
        if (terms.expected_annual_yield) {
          return `${terms.expected_annual_yield}% + upside`;
        } else if (terms.revenue_share_percentage) {
          return `${terms.revenue_share_percentage}% revenue + equity`;
        }
        return "Hybrid returns";
      default:
        return "";
    }
  })();

  // Format risk level for display
  const riskLevel = (() => {
    if (!terms?.risk_level) return "";

    const riskMap: Record<string, string> = {
      low: "Low Risk",
      medium: "Medium Risk",
      high: "High Risk",
      very_high: "Very High Risk",
    };

    return riskMap[terms.risk_level] || "";
  })();

  // Calculate projected date based on investment horizon
  const projectedDate = (() => {
    if (!terms?.investment_horizon_months) return null;

    const monthsFromNow = terms.investment_horizon_months;
    const targetDate = new Date();
    targetDate.setMonth(targetDate.getMonth() + monthsFromNow);

    return targetDate.toLocaleDateString("en-US", {
      month: "short",
      year: "numeric",
    });
  })();

  // Check if this is a verified producer (has track record)
  const isVerifiedProducer = !!(
    terms?.track_record && terms.track_record.length > 0
  );

  return {
    terms,
    isLoading,
    error,
    formattedReturn,
    riskLevel,
    projectedDate,
    isVerifiedProducer,
  };
}
