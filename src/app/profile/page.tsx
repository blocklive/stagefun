"use client";

import ProfileComponent from "./components/ProfileComponent";
import { useSmartWallet } from "../../hooks/useSmartWallet";
import { CheckPoolsButton } from "../../components/CheckPoolsButton";

export default function ProfilePage() {
  // This will log the smart wallet address to the console
  useSmartWallet();

  return (
    <>
      <ProfileComponent />
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
