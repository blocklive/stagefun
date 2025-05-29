"use client";

import { useEffect, useState, useRef } from "react";
import {
  usePrivy,
  useWallets,
  useCreateWallet,
  User,
  Wallet,
} from "@privy-io/react-auth";
import { useInitializeSmartWallet } from "../lib/utils/smartWalletUtils";
import showToast from "../utils/toast";

/**
 * Hidden component that initializes the smart wallet client
 * and ensures wallets are created, with manual fallback
 */
export default function SmartWalletInitializer() {
  const { authenticated, user, ready: privyReady } = usePrivy();
  const { wallets, ready: walletsReady } = useWallets();
  const { createWallet } = useCreateWallet();
  const { smartWalletClient } = useInitializeSmartWallet();
  const [isCheckingWallets, setIsCheckingWallets] = useState(false);

  // Add a ref to track if we're currently creating a wallet to prevent re-entry
  const isCreatingWallet = useRef(false);

  useEffect(() => {
    // Function to check and create wallets if needed
    const checkAndCreateWallets = async () => {
      // Only run if all dependencies are ready and user is logged in
      // Ensure walletsReady is true before checking wallets and user.linkedAccounts
      if (
        !authenticated ||
        !user ||
        !privyReady ||
        !walletsReady ||
        isCheckingWallets ||
        !createWallet ||
        isCreatingWallet.current
      ) {
        return;
      }

      // Set both flags to prevent re-entry
      setIsCheckingWallets(true);
      isCreatingWallet.current = true;

      try {
        // 1. Check for embedded wallet - only after walletsReady is true
        const hasEmbeddedWallet =
          wallets &&
          wallets.some((wallet) => wallet.walletClientType === "privy");

        // 2. Check for smart wallet - only after walletsReady is true
        const hasSmartWallet = user.linkedAccounts.some(
          (account) => account.type === "smart_wallet"
        );

        console.log("Wallet check:", {
          hasEmbeddedWallet,
          hasSmartWallet,
          walletCount: wallets?.length || 0,
          walletsReady,
        });

        // If user has either wallet type, we're done
        if (hasEmbeddedWallet || hasSmartWallet) {
          console.log("User has at least one wallet type, no action needed");
          return;
        }

        // Only create wallet if both wallet types are missing
        console.log("Both embedded and smart wallets missing, creating wallet");

        try {
          // Create the embedded wallet using Privy's createWallet
          const newWallet = await createWallet();
          console.log(
            "Embedded wallet created successfully:",
            newWallet.address
          );

          // Wait for smart wallet to be created automatically
          const toastId = showToast.loading("Setting up your wallet...");

          // Wait for smart wallet creation
          const smartWalletResult = await waitForSmartWallet(user, toastId);

          if (smartWalletResult.success) {
            console.log("Wallet creation successful", {
              embeddedWallet: newWallet.address,
              smartWallet: smartWalletResult.smartWalletAddress,
            });
            showToast.success("Wallet setup complete", { id: toastId });
          } else {
            console.error(
              "Smart wallet creation failed:",
              smartWalletResult.error
            );
            showToast.error(
              smartWalletResult.error || "Smart wallet setup failed",
              { id: toastId }
            );
          }
        } catch (error) {
          const errorMessage =
            error instanceof Error
              ? error.message
              : "Unknown error creating wallet";

          // Check for the specific errors that should be treated as no-ops
          if (
            errorMessage.includes("User already has an embedded wallet") ||
            errorMessage.includes("cannot have more than one ethereum embedded")
          ) {
            // This is actually not an error - wallet exists but wasn't detected initially
            // or there was a race condition. Treat as success.
            console.log(
              "Wallet already exists (race condition or not detected initially):",
              errorMessage
            );
            // Don't show error toast - this is expected behavior
          } else {
            // For any other error, show a toast
            console.error("Error creating wallet:", errorMessage);
            showToast.error("Failed to create wallet");
          }
        }
      } catch (error) {
        console.error("Error in wallet initialization:", error);
      } finally {
        setIsCheckingWallets(false);
        isCreatingWallet.current = false;
      }
    };

    // Run wallet check
    checkAndCreateWallets();
  }, [
    authenticated,
    user,
    privyReady,
    walletsReady,
    wallets,
    createWallet,
    smartWalletClient,
  ]);

  return null; // This is a non-visual component
}

/**
 * Waits for a smart wallet to be created
 * @param user The Privy user
 * @param toastId Optional toast ID for notifications
 * @returns Success status and smart wallet address
 */
async function waitForSmartWallet(
  user: User,
  toastId?: string
): Promise<{
  success: boolean;
  smartWalletAddress?: string;
  error?: string;
}> {
  // Wait for smart wallet creation
  let attempts = 0;
  const maxAttempts = 10;
  const delay = 2000; // ms

  while (attempts < maxAttempts) {
    console.log(
      `Waiting for smart wallet, attempt ${attempts + 1}/${maxAttempts}`
    );

    // Wait before checking
    await new Promise((resolve) => setTimeout(resolve, delay));

    // Check if smart wallet was created during wait
    const smartWalletAccount = user.linkedAccounts.find(
      (account) => account.type === "smart_wallet"
    );

    // Check if it's a smart wallet account with an address
    if (smartWalletAccount && "address" in smartWalletAccount) {
      const smartWalletAddress = smartWalletAccount.address as string;
      console.log("Smart wallet found:", smartWalletAddress);

      // Sync with database
      await syncWalletWithDatabase(user);

      return {
        success: true,
        smartWalletAddress,
      };
    }

    attempts++;
  }

  // If we get here, smart wallet creation timed out
  return {
    success: false,
    error: "Smart wallet creation timed out. Please try again later.",
  };
}

/**
 * Syncs wallet information with the database by calling complete-login
 */
async function syncWalletWithDatabase(user: User): Promise<boolean> {
  try {
    const response = await fetch("/api/auth/complete-login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        privyUserData: {
          linkedAccounts: user.linkedAccounts,
          id: user.id,
        },
      }),
    });

    if (!response.ok) {
      console.warn("Failed to sync wallet with database");
      return false;
    }

    console.log("Wallet successfully synced with database");
    return true;
  } catch (error) {
    console.error("Error syncing wallet with database:", error);
    return false;
  }
}
