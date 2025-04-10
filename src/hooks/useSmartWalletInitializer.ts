import { useEffect } from "react";
import { User } from "../lib/supabase";
import { ensureSmartWallet } from "../lib/utils/smartWalletUtils";

interface UseSmartWalletInitializerParams {
  isOwnProfile: boolean;
  privyUser: any;
  dbUser: User | null;
  smartWalletAddress: string | null;
  refreshUser: () => Promise<void>;
  authenticated?: boolean; // Optional: only check if authenticated is true
  ready?: boolean; // Optional: only check if ready is true
}

/**
 * Custom hook to initialize smart wallet on component mount
 * Will attempt to ensure a smart wallet is available if conditions are met
 *
 * @param params Configuration parameters for the hook
 * @returns Nothing - side effect only hook
 */
export function useSmartWalletInitializer({
  isOwnProfile,
  privyUser,
  dbUser,
  smartWalletAddress,
  refreshUser,
  authenticated = true, // Default to true if not provided
  ready = true, // Default to true if not provided
}: UseSmartWalletInitializerParams): void {
  useEffect(() => {
    const initializeSmartWallet = async () => {
      // Only check if authenticated and ready
      if (!ready || !authenticated) return;

      // Only check for own profile
      if (!isOwnProfile || !privyUser || !dbUser) return;

      // Check if we already have a smart wallet
      if (dbUser.smart_wallet_address && smartWalletAddress) {
        console.log("Smart wallet already available:", smartWalletAddress);
        return;
      }

      console.log("Checking smart wallet on initialization");
      const result = await ensureSmartWallet(privyUser);

      if (result.success) {
        console.log("Smart wallet initialized:", result.smartWalletAddress);
        // Refresh user data to update UI with new wallet info
        await refreshUser();
      } else {
        console.log("Smart wallet initialization skipped:", result.error);
      }
    };

    initializeSmartWallet();
  }, [
    isOwnProfile,
    privyUser,
    dbUser,
    smartWalletAddress,
    refreshUser,
    authenticated,
    ready,
  ]);
}
