export type ReturnType =
  | "fixed_yield"
  | "revenue_share"
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
  yieldCalculationMethod?: YieldCalculationMethod;

  // Revenue Share Details
  revenueSharePercentage?: number;
  revenueDistributionFrequency?: DistributionFrequency;

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
