"use client";

import { User } from "../../../lib/supabase";
import showToast from "@/utils/toast";
import { ensureSmartWallet } from "../../../lib/utils/smartWalletUtils";

interface AccountSetupMessageProps {
  user: User;
  displayName: string;
  isOwnProfile: boolean;
  privyUser: any;
  onSmartWalletReady?: () => void;
}

const AccountSetupMessage = ({
  user,
  displayName,
  isOwnProfile,
  privyUser,
  onSmartWalletReady,
}: AccountSetupMessageProps) => {
  const handleSetupClick = async () => {
    const loadingToast = showToast.loading("Checking account status...");
    try {
      const result = await ensureSmartWallet(privyUser, loadingToast);
      if (result.success) {
        showToast.success("Account initialized successfully!", {
          id: loadingToast,
        });
        // Call the callback to refresh user data
        onSmartWalletReady?.();
      } else {
        showToast.error(result.error || "Failed to initialize account", {
          id: loadingToast,
        });
      }
    } catch (error) {
      showToast.error("An error occurred while setting up your account", {
        id: loadingToast,
      });
      console.error("Account setup error:", error);
    }
  };

  return (
    <div className="mt-6 mb-12 flex flex-col items-center justify-center py-10 px-4 text-center">
      <div className="w-16 h-16 mb-4 flex items-center justify-center rounded-full bg-[#FFFFFF0A]">
        <svg
          className="w-8 h-8 text-amber-400"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M12 8V12"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M12 16H12.01"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
      <h3 className="text-xl font-medium text-white mb-2">
        {isOwnProfile
          ? "Your account is still being set up"
          : `${displayName}'s account is still being set up`}
      </h3>
      <p className="text-gray-400 max-w-md">
        {isOwnProfile
          ? "Please complete your account setup to create and fund pools"
          : "This user hasn't completed their account setup yet"}
      </p>
      {isOwnProfile && !user.smart_wallet_address && (
        <button
          onClick={handleSetupClick}
          className="mt-6 px-4 py-2 bg-[#FFFFFF14] hover:bg-[#FFFFFF1A] rounded-lg text-white text-sm transition-colors flex items-center"
        >
          <svg
            className="w-4 h-4 mr-2"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M23 4V10H17"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M1 20V14H7"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M3.51 9.00001C4.01717 7.56328 4.87913 6.2763 6.01547 5.27543C7.1518 4.27455 8.52547 3.59073 10.0083 3.29028C11.4911 2.98983 13.0348 3.08326 14.4761 3.56327C15.9175 4.04328 17.2124 4.89345 18.24 6.00001L23 10M1 14L5.76 18C6.78761 19.1066 8.08254 19.9567 9.52387 20.4367C10.9652 20.9168 12.5089 21.0102 13.9917 20.7097C15.4745 20.4093 16.8482 19.7255 17.9845 18.7246C19.1209 17.7237 19.9828 16.4367 20.49 15"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          Complete Account Setup
        </button>
      )}
    </div>
  );
};

export default AccountSetupMessage;
