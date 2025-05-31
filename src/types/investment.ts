export type ReturnType =
  | "fixed_yield"
  | "revenue_share"
  | "profit_share"
  | "appreciation"
  | "hybrid";

export type RiskLevel = "low" | "medium" | "high";

export type RegulatoryFramework =
  | "reg_cf"
  | "reg_d_506b"
  | "reg_d_506c"
  | "reg_a"
  | "other";

export type SecurityType =
  | "equity"
  | "preferred"
  | "convertible_note"
  | "safe"
  | "debt"
  | "revenue_participation"
  | "token"
  | "security_token";

export type TrackRecord =
  | "first_time"
  | "some_experience"
  | "proven_track_record";

export type DistributionFrequency =
  | "monthly"
  | "quarterly"
  | "annually"
  | "event_based";

export type YieldCalculationMethod = "simple" | "compound" | "variable";

export type BenchmarkComparison = "market" | "industry" | "custom" | "none";

export interface InvestmentTerms {
  id?: string;
  poolId?: string;
  returnType: ReturnType;

  // Yield Information
  expectedAnnualYield?: number;
  yieldDistributionFrequency?: DistributionFrequency;

  // Revenue Share Details
  revenueSharePercentage?: number;
  revenueDistributionFrequency?: DistributionFrequency;

  // Profit Share Details
  profitSharePercentage?: number;
  profitShareDistributionFrequency?: DistributionFrequency;

  // Asset Appreciation
  projectedAppreciationPercentage?: number;
  appreciationTimeframeMonths?: number;

  // Risk & Terms
  riskLevel: RiskLevel;
  investmentHorizonMonths: number;
  minimumHoldPeriodMonths?: number;

  // Regulatory Compliance
  regulatoryFramework?: RegulatoryFramework;
  securityType?: SecurityType;
  accreditedOnly?: boolean;

  // Fees
  managementFeePercentage?: number;
  performanceFeePercentage?: number;

  // Historical Performance
  trackRecord?: TrackRecord;
  similarProjectsCount?: number;
  averageReturnsDescription?: string;
  notableSuccesses?: string;
  benchmarkComparison?: BenchmarkComparison;

  // Legal & Disclaimers
  termsAndConditions?: string;
  riskDisclosure?: string;
  regulatoryNotes?: string;

  // Template tracking
  templateUsed?: string;
}

export interface TierInvestmentEnhancement {
  id?: string;
  tierId: string;
  poolId: string;
  yieldBonusPercentage?: number;
  feeDiscountPercentage?: number;
  earlyAccess?: boolean;
  liquidityPreferenceRank?: number;
  votingRights?: boolean;
  enhancedRewards?: boolean;
  customBenefits?: string;
}

export interface InvestmentTemplate {
  id: string;
  name: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  terms: Partial<InvestmentTerms>;
}

export interface RegulatoryFrameworkInfo {
  label: string;
  description: string;
  maxRaise?: number;
  accreditedOnly: boolean;
  disclosure: string;
}

export interface SecurityTypeInfo {
  label: string;
  description: string;
}

export interface InvestmentTermsDB {
  id?: string;
  pool_id?: string;
  return_type: ReturnType;

  // Yield Information
  expected_annual_yield?: number;
  yield_distribution_frequency?: DistributionFrequency;

  // Revenue Share Details
  revenue_share_percentage?: number;
  revenue_distribution_frequency?: DistributionFrequency;

  // Profit Share Details
  profit_share_percentage?: number;
  profit_share_distribution_frequency?: DistributionFrequency;

  // Asset Appreciation
  projected_appreciation_percentage?: number;
  appreciation_timeframe_months?: number;

  // Risk & Terms
  risk_level: RiskLevel;
  investment_horizon_months: number;
  minimum_hold_period_months?: number;

  // Regulatory Compliance
  regulatory_framework?: RegulatoryFramework;
  security_type?: SecurityType;
  accredited_only?: boolean;

  // Fees
  management_fee_percentage?: number;
  performance_fee_percentage?: number;

  // Historical Performance
  track_record?: TrackRecord;
  similar_projects_count?: number;
  average_returns_description?: string;
  notable_successes?: string;
  benchmark_comparison?: BenchmarkComparison;

  // Legal & Disclaimers
  terms_and_conditions?: string;
  risk_disclosure?: string;
  regulatory_notes?: string;

  // Template tracking
  template_used?: string;

  // Timestamps
  created_at?: string;
  updated_at?: string;
}
