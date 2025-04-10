import { User } from "@privy-io/react-auth";
import { useSmartWallets } from "@privy-io/react-auth/smart-wallets";
import showToast from "@/utils/toast";

/**
 * Actively initialize the smart wallet client which triggers smart wallet creation if not already done
 * Can be used on the client side to ensure the wallet gets created
 */
export function useInitializeSmartWallet() {
  const { client } = useSmartWallets();

  return {
    smartWalletClient: client,
  };
}

/**
 * Ensures that a smart wallet is available and synchronized with the database
 * Will retry up to 2 times if the smart wallet is not available
 *
 * @param user The Privy user object
 * @param loadingToastId Optional toast ID for showing loading status
 * @returns Object with success status, smart wallet address, and error message if applicable
 */
export async function ensureSmartWallet(
  user: User | null | undefined,
  loadingToastId?: string
): Promise<{
  success: boolean;
  smartWalletAddress: string | null;
  error?: string;
}> {
  if (!user) {
    return {
      success: false,
      smartWalletAddress: null,
      error: "User is not authenticated",
    };
  }

  // First check if we have a smart wallet address in our database
  try {
    const response = await fetch("/api/user/profile", {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        // Auth token is automatically added by browser
      },
    });

    if (response.ok) {
      const data = await response.json();

      // If we have a smart wallet address in our database, we're good
      if (data.user?.smart_wallet_address) {
        return {
          success: true,
          smartWalletAddress: data.user.smart_wallet_address,
        };
      }
    }
  } catch (error) {
    console.error("Error checking user profile in database:", error);
    // Continue with Privy check if DB check fails
  }

  // If we don't have it in the database, check Privy
  let smartWalletAccount = user.linkedAccounts.find(
    (account) => account.type === "smart_wallet"
  );

  // If Privy has it, sync to our database
  if (smartWalletAccount?.address) {
    console.log("Smart wallet found in Privy but not in DB, syncing...");
    await syncSmartWalletWithDB(user);
    return {
      success: true,
      smartWalletAddress: smartWalletAccount.address,
    };
  }

  // Neither Privy nor our DB has the smart wallet, retry logic to wait for it
  if (loadingToastId) {
    showToast.loading("Setting up your smart wallet...", {
      id: loadingToastId,
    });
  }

  // Retry logic - attempt 2 times with a delay
  const maxRetries = 2;
  const retryDelay = 2000; // 2 seconds

  for (let retryCount = 0; retryCount < maxRetries; retryCount++) {
    console.log(`Smart wallet retry attempt ${retryCount + 1}/${maxRetries}`);

    // Wait before checking again
    await new Promise((resolve) => setTimeout(resolve, retryDelay));

    // Check if smart wallet has been created during the wait
    smartWalletAccount = user.linkedAccounts.find(
      (account) => account.type === "smart_wallet"
    );

    if (smartWalletAccount?.address) {
      // Call the complete-login API to update the database with the smart wallet address
      await syncSmartWalletWithDB(user);

      // Smart wallet is available, return success
      return {
        success: true,
        smartWalletAddress: smartWalletAccount.address,
      };
    }
  }

  // After all retries, still no smart wallet
  if (loadingToastId) {
    showToast.error("Smart wallet sync in progress, please retry", {
      id: loadingToastId,
    });
  }

  return {
    success: false,
    smartWalletAddress: null,
    error: "Smart wallet sync in progress, please retry",
  };
}

/**
 * Helper function to sync the smart wallet with our database
 * by calling the complete-login API
 */
export async function syncSmartWalletWithDB(user: User): Promise<boolean> {
  try {
    const response = await fetch("/api/auth/complete-login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // Auth token is automatically added by the browser
      },
      body: JSON.stringify({
        privyUserData: {
          linkedAccounts: user.linkedAccounts,
          id: user.id,
        },
      }),
    });

    if (!response.ok) {
      console.warn("Could not update smart wallet in database");
      return false;
    }

    console.log("Smart wallet successfully synchronized with database");
    return true;
  } catch (error) {
    console.error("Error updating smart wallet in database:", error);
    return false;
  }
}

/**
 * Validates that a smart wallet is available and initialized
 * Uses the existing smart wallet address and functions from hooks
 *
 * @param user - The Privy user object
 * @param loadingToast - The ID of an active toast for showing loading states
 * @param smartWalletAddress - Smart wallet address from useSmartWallet hook
 * @param callContractFunction - Function from useSmartWallet hook
 * @returns Result object with success status
 */
export async function validateSmartWallet(
  user: any,
  loadingToast: string,
  smartWalletAddress: string | undefined,
  callContractFunction: any
): Promise<{ success: boolean; error?: string }> {
  // Ensure smart wallet is available with DB synchronization
  const smartWalletResult = await ensureSmartWallet(user, loadingToast);

  if (!smartWalletResult.success) {
    const errorMsg =
      smartWalletResult.error || "Smart wallet sync in progress, please retry";
    showToast.error(errorMsg, { id: loadingToast });
    return { success: false, error: errorMsg };
  }

  // Now that we've verified wallet exists, check the original smartWalletAddress from the hook
  if (!smartWalletAddress || !callContractFunction) {
    const errorMsg =
      "Smart wallet functions not available. Please try again later.";
    showToast.error(errorMsg, { id: loadingToast });
    return { success: false, error: errorMsg };
  }

  return { success: true };
}

/**
 * Standardizes smart wallet error messages
 * Checks if an error message contains known smart wallet issue phrases
 * and returns a consistent user-friendly message
 *
 * @param errorMessage The original error message
 * @returns Standardized error message if it's a smart wallet issue, or the original message
 */
export function standardizeSmartWalletError(errorMessage: string): string {
  const lowerErrorMsg = errorMessage.toLowerCase();

  if (
    lowerErrorMsg.includes("smart wallet") ||
    lowerErrorMsg.includes("account not found") ||
    lowerErrorMsg.includes("wallet creation") ||
    lowerErrorMsg.includes("not initialized")
  ) {
    return "Smart wallet sync in progress, please retry";
  }

  return errorMessage;
}
