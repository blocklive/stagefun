"use client";

import ProfileComponent from "./components/ProfileComponent";
import { useSmartWallet } from "../../hooks/useSmartWallet";
import { CheckPoolsButton } from "../../components/CheckPoolsButton";
import { useUserAssets } from "../../hooks/useUserAssets";

export default function ProfilePage() {
  // Use our smart wallet hook to access the smart wallet
  const { smartWalletAddress } = useSmartWallet();
  const { refreshUsdcBalance } = useUserAssets();

  return (
    <>
      <ProfileComponent />

      {smartWalletAddress && (
        <div className="max-w-4xl mx-auto px-4 py-8 mt-8 bg-[#1E1B30] rounded-lg">
          <h2 className="text-2xl font-bold text-white mb-4">Smart Wallet</h2>
          <p className="text-gray-300 mb-2">
            Your smart wallet address:{" "}
            <code className="bg-[#2D2A40] px-2 py-1 rounded">
              {smartWalletAddress}
            </code>
          </p>
          <p className="text-gray-300 mb-6">
            This is your gas-free wallet powered by Account Abstraction. All
            operations using this wallet have gas fees sponsored by ZeroDev.
          </p>
          <div className="flex flex-wrap gap-4">
            <button
              onClick={refreshUsdcBalance}
              className="bg-[#8364FF] text-white px-6 py-3 rounded-lg hover:bg-[#7354EF] transition-colors"
            >
              Refresh Balances
            </button>
          </div>
        </div>
      )}

      <div className="max-w-4xl mx-auto px-4 py-8 mt-8 bg-[#1E1B30] rounded-lg">
        <h2 className="text-2xl font-bold text-white mb-4">
          Gas-Free Operations
        </h2>
        <p className="text-gray-300 mb-6">
          This operation will check the status of all pools in the system using
          your smart wallet with gas fees sponsored by ZeroDev.
        </p>
        <CheckPoolsButton />
      </div>
    </>
  );
}
