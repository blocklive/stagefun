"use client";

import { useEffect } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { useInitializeSmartWallet } from "../lib/utils/smartWalletUtils";

/**
 * Hidden component that initializes the smart wallet client
 *
 * This component should be mounted early in the app flow
 * to initialize the smart wallet client as soon as the user logs in.
 *
 * While Privy's SmartWalletsProvider should create wallets automatically,
 * mounting this component ensures the client is initialized, which can
 * encourage wallet creation to happen earlier.
 */
export default function SmartWalletInitializer() {
  const { authenticated, user } = usePrivy();
  const { smartWalletClient } = useInitializeSmartWallet();

  useEffect(() => {
    if (authenticated && user) {
      // Check if the wallet already exists
      const hasSmartWallet = user.linkedAccounts.some(
        (account) => account.type === "smart_wallet"
      );

      if (!hasSmartWallet) {
        console.log("SmartWalletInitializer: Initializing smart wallet client");

        // Just initializing the client with useSmartWallets() can help
        // trigger wallet creation based on Privy's auto-creation settings
        if (smartWalletClient) {
          console.log("SmartWalletInitializer: Smart wallet client available");
        } else {
          console.log(
            "SmartWalletInitializer: Smart wallet client not yet available"
          );
        }
      }
    }
  }, [authenticated, user, smartWalletClient]);

  // This is a non-visual component
  return null;
}
