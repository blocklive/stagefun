export interface RewardItem {
  id: string;
  name: string;
  description: string;
  type: string;
}

export interface Tier {
  id: string;
  name: string;
  price: string;
  isActive: boolean;
  nftMetadata: string;
  isVariablePrice: boolean;
  minPrice: string;
  maxPrice: string;
  maxPatrons: string;
  description: string;
  rewardItems: string[];
  imageUrl?: string;
  modifiedFields: Set<string>;
  pricingMode?: "fixed" | "range" | "uncapped";
  patronsMode?: "limited" | "uncapped";
  onchain_index?: number;
}
