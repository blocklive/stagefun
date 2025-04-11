export interface AssetQuantity {
  int: string;
  decimals: number;
  float: number;
  numeric: string;
}

export interface AssetChanges {
  absolute_1d: number;
  percent_1d: number;
}

export interface AssetImplementation {
  chain_id: string;
  address: string | null;
  decimals: number;
}

export interface FungibleInfo {
  name: string;
  symbol: string;
  icon: {
    url: string | null;
  } | null;
  flags: {
    verified: boolean;
  };
  implementations: AssetImplementation[];
}

export interface AssetFlags {
  displayable: boolean;
  is_trash: boolean;
}

export interface AssetAttributes {
  parent: any;
  protocol: any;
  name: string;
  position_type: string;
  quantity: AssetQuantity;
  value: number | null;
  price: number;
  changes: AssetChanges | null;
  fungible_info: FungibleInfo;
  flags: AssetFlags;
  updated_at: string;
  updated_at_block: number;
}

export interface AssetRelationship {
  links: {
    related: string;
  };
  data: {
    type: string;
    id: string;
  };
}

export interface AssetRelationships {
  chain: AssetRelationship;
  fungible: AssetRelationship;
}

export interface Asset {
  type: string;
  id: string;
  attributes: AssetAttributes;
  relationships: AssetRelationships;
}

export interface WalletAssetsResponse {
  links: {
    self: string;
  };
  data: Asset[];
}
