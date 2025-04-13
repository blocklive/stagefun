import React from "react";
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
}

interface BalanceSectionProps {
  totalBalance: string;
  assets: Asset[];
  onSendClick: (asset: Asset, e: React.MouseEvent) => void;
  walletAddress?: string | null; // Add wallet address for Zerion API
  useZerionAPI?: boolean; // Flag to use the new Zerion API
  chainId?: string; // Blockchain chain ID to use with Zerion
}

export default function BalanceSection({
  totalBalance,
  assets,
  onSendClick,
  walletAddress = null,
  useZerionAPI = false,
  chainId = "monad-test-v2",
}: BalanceSectionProps) {
  // Handler for Zerion assets
  const handleZerionSendClick = (zerionAsset: ZerionAsset) => {
    // Convert Zerion asset to our Asset format for consistency
    const asset: Asset = {
      name: zerionAsset.attributes.fungible_info.name,
      symbol: zerionAsset.attributes.fungible_info.symbol,
      balance: zerionAsset.attributes.quantity.float.toString(),
      value: zerionAsset.attributes.quantity.float, // Using the same value as per requirements
      type: "token", // Assuming all Zerion assets are tokens
    };

    onSendClick(asset, {} as React.MouseEvent);
  };

  if (useZerionAPI && walletAddress) {
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

  return (
    <div className="px-4 py-6">
      <h2 className="text-xl text-gray-400 mb-2">Balance</h2>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-5xl font-bold">${totalBalance}</h1>
      </div>

      <h2 className="text-2xl font-bold mt-8 mb-4">My assets</h2>
      {assets.length > 0 ? (
        <div className="space-y-4">
          {assets.map((asset, index) => (
            <div
              key={index}
              className="flex justify-between items-center py-4 px-4 bg-[#FFFFFF0A] rounded-xl hover:bg-[#2A2640] transition-colors"
            >
              <div className="flex items-center">
                {asset.type === "token" && asset.symbol === "USDC" ? (
                  <div className="w-10 h-10 rounded-full flex items-center justify-center">
                    <Image
                      src="/icons/usdc-logo.svg"
                      alt="USDC"
                      width={32}
                      height={32}
                      className="w-8 h-8"
                    />
                  </div>
                ) : (
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      asset.type === "token"
                        ? "bg-blue-800"
                        : asset.type === "pool"
                        ? "bg-purple-800"
                        : "bg-green-800"
                    }`}
                  >
                    {asset.type === "token" ? (
                      <FaDollarSign className="text-white" />
                    ) : asset.type === "pool" ? (
                      <FaUsers className="text-white" />
                    ) : (
                      <IoFlash className="text-white" />
                    )}
                  </div>
                )}

                <div className="ml-3">
                  <div className="flex items-center">
                    <h3 className="font-semibold">{asset.name}</h3>
                    {asset.status && (
                      <span className="ml-2 text-sm text-gray-400">
                        • {asset.status}
                      </span>
                    )}
                  </div>
                  <p className="text-gray-400">
                    {asset.balance} {asset.symbol}
                  </p>
                </div>
              </div>
              <div className="flex items-center">
                <div className="text-right mr-4">
                  <p className="font-bold">${asset.value.toFixed(2)}</p>
                </div>
                <button
                  onClick={(e) => onSendClick(asset, e)}
                  className="px-4 py-2 bg-[#FFFFFF14] hover:bg-[#FFFFFF1A] rounded-lg text-white text-sm transition-colors"
                >
                  Send
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-4 text-gray-400">
          No assets found. Add USDC to your smart wallet to get started!
        </div>
      )}
    </div>
  );
}
