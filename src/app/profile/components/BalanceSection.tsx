import React from "react";
import type { RefObject } from "react";
import Image from "next/image";
import { FaDollarSign, FaUsers } from "react-icons/fa";
import { IoFlash } from "react-icons/io5";
import WalletAssets from "../../components/WalletAssets";
import { Asset as ZerionAsset } from "../../../lib/zerion/ZerionSDK";

interface Asset {
  name: string;
  symbol: string;
  balance: string;
  value: number;
  type: "token" | "pool" | "native";
  status?: string;
  address?: string;
}

interface BalanceSectionProps {
  onSendClick: (asset: Asset, e: React.MouseEvent) => void;
  walletAddress?: string | null;
  chainId?: string;
}

export default function BalanceSection({
  onSendClick,
  walletAddress = null,
  chainId = "monad-test-v2",
}: BalanceSectionProps) {
  // Handler for Zerion assets
  const handleZerionSendClick = (zerionAsset: ZerionAsset) => {
    // Get token implementation with address if available
    const tokenImplementation =
      zerionAsset.attributes.fungible_info?.implementations?.[0];
    const tokenAddress = tokenImplementation?.address;

    // Convert Zerion asset to our Asset format for consistency
    const asset: Asset = {
      name: zerionAsset.attributes.fungible_info.name,
      symbol: zerionAsset.attributes.fungible_info.symbol,
      balance: zerionAsset.attributes.quantity.float.toString(),
      value: zerionAsset.attributes.quantity.float, // Using the same value as per requirements
      type: "token", // Assuming all Zerion assets are tokens
      address: tokenAddress, // Add token address if available
    };

    console.log("Sending Zerion asset:", {
      symbol: asset.symbol,
      address: asset.address || "Not available",
      name: asset.name,
    });

    // Create a synthetic event with stopPropagation method
    const syntheticEvent = {
      stopPropagation: () => {},
    } as React.MouseEvent;

    onSendClick(asset, syntheticEvent);
  };

  // Always render WalletAssets
  return (
    <div className="px-4 py-6">
      <WalletAssets
        walletAddress={walletAddress}
        chainId={chainId}
        className="mt-4"
        onSendClick={handleZerionSendClick}
      />
    </div>
  );
}
