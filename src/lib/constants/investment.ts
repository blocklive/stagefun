import {
  InvestmentTemplate,
  RegulatoryFrameworkInfo,
  SecurityTypeInfo,
  RegulatoryFramework,
  SecurityType,
  RiskLevel,
  ReturnType,
} from "@/types/investment";
import {
  MusicalNoteIcon,
  BuildingOfficeIcon,
  CurrencyDollarIcon,
  CpuChipIcon,
  RocketLaunchIcon,
  DevicePhoneMobileIcon,
  BriefcaseIcon,
} from "@heroicons/react/24/outline";

export const REGULATORY_FRAMEWORKS: Record<
  RegulatoryFramework,
  RegulatoryFrameworkInfo
> = {
  reg_cf: {
    label: "Regulation CF",
    description: "Crowdfunding exemption for retail investors",
    maxRaise: 5000000, // $5M max
    accreditedOnly: false,
    disclosure:
      "Available to all investors with investment limits based on income/net worth",
  },
  reg_d_506b: {
    label: "Regulation D 506(b)",
    description: "Private placement for up to 35 non-accredited investors",
    accreditedOnly: false,
    disclosure:
      "Limited to 35 non-accredited investors, no general solicitation",
  },
  reg_d_506c: {
    label: "Regulation D 506(c)",
    description: "Private placement for accredited investors only",
    accreditedOnly: true,
    disclosure: "Accredited investors only, general solicitation permitted",
  },
  reg_a: {
    label: "Regulation A+",
    description: "Mini-IPO for broader public offerings",
    maxRaise: 75000000, // $75M max
    accreditedOnly: false,
    disclosure: "Available to all investors, requires SEC qualification",
  },
  other: {
    label: "Other/International",
    description: "Other regulatory frameworks or international offerings",
    accreditedOnly: false,
    disclosure: "Consult with legal counsel for specific requirements",
  },
};

export const SECURITY_TYPES: Record<SecurityType, SecurityTypeInfo> = {
  equity: {
    label: "Equity Shares",
    description: "Ownership stakes in the company",
  },
  preferred: {
    label: "Preferred Shares",
    description: "Shares with preferential rights",
  },
  convertible_note: {
    label: "Convertible Note",
    description: "Debt that converts to equity",
  },
  safe: {
    label: "SAFE Agreement",
    description: "Simple Agreement for Future Equity",
  },
  debt: {
    label: "Debt Security",
    description: "Fixed-income debt instrument",
  },
  revenue_participation: {
    label: "Revenue Participation",
    description: "Rights to future revenue streams",
  },
  token: {
    label: "Utility Token",
    description: "Blockchain-based utility tokens",
  },
  security_token: {
    label: "Security Token",
    description: "Blockchain-based security tokens",
  },
};

export const INVESTMENT_TEMPLATES: InvestmentTemplate[] = [
  {
    id: "event",
    name: "Event",
    description: "Concerts, festivals, conferences with fixed returns",
    icon: MusicalNoteIcon,
    terms: {
      returnType: "fixed_yield",
      expectedAnnualYield: 12,
      riskLevel: "medium",
      investmentHorizonMonths: 6,
      regulatoryFramework: "reg_cf",
      securityType: "revenue_participation",
      managementFeePercentage: 0,
      performanceFeePercentage: 0,
      minimumHoldPeriodMonths: 3,
      yieldCalculationMethod: "simple",
    },
  },
  {
    id: "venue",
    name: "Venue",
    description: "Restaurants, bars, clubs with revenue sharing",
    icon: BuildingOfficeIcon,
    terms: {
      returnType: "revenue_share",
      revenueSharePercentage: 8,
      revenueDistributionFrequency: "quarterly",
      riskLevel: "medium",
      investmentHorizonMonths: 24,
      regulatoryFramework: "reg_d_506c",
      securityType: "revenue_participation",
      managementFeePercentage: 0,
      performanceFeePercentage: 0,
      minimumHoldPeriodMonths: 12,
    },
  },
  {
    id: "fund",
    name: "Fund",
    description: "Crypto/NFT funds with distribution",
    icon: CurrencyDollarIcon,
    terms: {
      returnType: "appreciation",
      projectedAppreciationPercentage: 25,
      appreciationTimeframeMonths: 18,
      riskLevel: "high",
      investmentHorizonMonths: 18,
      regulatoryFramework: "reg_d_506c",
      securityType: "equity",
      managementFeePercentage: 0,
      performanceFeePercentage: 0,
      minimumHoldPeriodMonths: 12,
    },
  },
  {
    id: "token",
    name: "Token",
    description: "Raise for a pure ICO",
    icon: CpuChipIcon,
    terms: {
      returnType: "appreciation",
      projectedAppreciationPercentage: 50,
      appreciationTimeframeMonths: 12,
      riskLevel: "high",
      investmentHorizonMonths: 12,
      regulatoryFramework: "other",
      securityType: "token",
      managementFeePercentage: 0,
      performanceFeePercentage: 0,
      minimumHoldPeriodMonths: 6,
    },
  },
  {
    id: "project",
    name: "Project",
    description: "General projects with hybrid returns",
    icon: BriefcaseIcon,
    terms: {
      returnType: "appreciation",
      expectedAnnualYield: 8,
      projectedAppreciationPercentage: 200,
      appreciationTimeframeMonths: 24,
      riskLevel: "medium",
      investmentHorizonMonths: 24,
      regulatoryFramework: "reg_cf",
      securityType: "equity",
      managementFeePercentage: 0,
      performanceFeePercentage: 0,
      minimumHoldPeriodMonths: 12,
    },
  },
];

export const RISK_LEVEL_INFO = {
  low: {
    label: "Low Risk",
    color: "text-green-400",
    bgColor: "bg-green-900/30",
  },
  medium: {
    label: "Medium Risk",
    color: "text-yellow-400",
    bgColor: "bg-yellow-900/30",
  },
  high: {
    label: "High Risk",
    color: "text-red-400",
    bgColor: "bg-red-900/30",
  },
};

export const RETURN_TYPE_INFO = {
  fixed_yield: {
    label: "Fixed Yield",
    description: "Guaranteed annual returns",
  },
  revenue_share: {
    label: "Revenue Share",
    description: "Percentage of ongoing revenue",
  },
  appreciation: {
    label: "Asset Appreciation",
    description: "Value growth over time",
  },
  hybrid: {
    label: "Hybrid Returns",
    description: "Combination of yield and appreciation",
  },
  royalty: {
    label: "Royalty Returns",
    description: "Percentage of net profits or post-recoupment revenue",
  },
};
