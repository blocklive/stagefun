"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";
import { usePrivy } from "@privy-io/react-auth";
import { supabase, User } from "../lib/supabase";
import { ensureSmartWallet } from "../lib/utils/smartWalletUtils";

// Make supabase available globally for direct access
if (typeof window !== "undefined") {
  (window as any).supabase = supabase;
}

// Define the context type
interface SupabaseContextType {
  dbUser: User | null;
  isLoadingUser: boolean;
  refreshUser: () => Promise<void>;
}

// Create the context with a default value
const SupabaseContext = createContext<SupabaseContextType>({
  dbUser: null,
  isLoadingUser: true,
  refreshUser: async () => {},
});

// Custom hook to use the Supabase context
export const useSupabase = () => useContext(SupabaseContext);

// Provider component
export const SupabaseProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { user: privyUser, authenticated, ready, getAccessToken } = usePrivy();
  const [dbUser, setDbUser] = useState<User | null>(null);
  const [isLoadingUser, setIsLoadingUser] = useState(true);
  const [sessionError, setSessionError] = useState<string | null>(null);

  // Function to check if there's a session error that needs to be reset
  const checkAndResetSession = useCallback(async () => {
    if (!authenticated && ready) {
      // If we have a stale cookie but no Privy session, clear everything
      if (
        document.cookie.includes("access_code") ||
        document.cookie.includes("accessCodeVerified")
      ) {
        console.log("Detected potential stale session, attempting to reset");

        // Clear all related cookies
        document.cookie =
          "access_code=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
        document.cookie =
          "accessCodeVerified=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";

        // Force reload to clear everything
        window.location.href = "/";
        return true;
      }
    }
    return false;
  }, [authenticated, ready]);

  // Call this on initial load to clear any stale sessions
  useEffect(() => {
    if (ready) {
      checkAndResetSession();
    }
  }, [ready, checkAndResetSession]);

  const fetchUser = useCallback(async () => {
    if (!authenticated || !privyUser) {
      setDbUser(null);
      setIsLoadingUser(false);
      return;
    }

    try {
      setIsLoadingUser(true);

      // Get Privy token for authentication using the correct method
      let token;
      try {
        token = await getAccessToken();
      } catch (err) {
        console.error("Error getting Privy token:", err);
        setIsLoadingUser(false);
        return;
      }

      if (!token) {
        console.error("Failed to get Privy token");
        setIsLoadingUser(false);
        return;
      }

      // Simple inline check for smart wallet with retries
      console.log("Checking for smart wallet during login...");

      // Check initially if the wallet already exists
      let smartWalletAddress = null;
      let smartWalletAccount = privyUser.linkedAccounts.find(
        (account) => account.type === "smart_wallet"
      );

      if (smartWalletAccount?.address) {
        console.log("Smart wallet found immediately during login");
        smartWalletAddress = smartWalletAccount.address;
      } else {
        // Not found, start retry process
        console.log("Smart wallet not immediately available, will retry");

        // Retry logic - attempt 3 times with a delay
        const maxRetries = 3;
        const retryDelay = 1000; // 1 second between retries

        for (let retryCount = 0; retryCount < maxRetries; retryCount++) {
          // Wait before checking again
          await new Promise((resolve) => setTimeout(resolve, retryDelay));

          console.log(
            `Smart wallet login check attempt ${retryCount + 1}/${maxRetries}`
          );

          // Check if smart wallet has been created during the wait
          smartWalletAccount = privyUser.linkedAccounts.find(
            (account) => account.type === "smart_wallet"
          );

          if (smartWalletAccount?.address) {
            console.log(
              `Smart wallet found on retry attempt ${retryCount + 1}`
            );
            smartWalletAddress = smartWalletAccount.address;
            break;
          }
        }

        if (!smartWalletAddress) {
          console.log("Smart wallet not found after retries during login");
        }
      }

      if (smartWalletAddress) {
        console.log("Smart wallet found during login:", smartWalletAddress);
      } else {
        console.log("No smart wallet found during login, continuing anyway");
      }

      // Call our secure backend endpoint for user creation/update instead of direct DB access
      const response = await fetch("/api/auth/complete-login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          privyUserData: privyUser,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        console.error("Error from complete-login API:", result.error);
        setIsLoadingUser(false);
        return;
      }

      setDbUser(result.user);
    } catch (error) {
      console.error("Error fetching user:", error);
      // Log more details about the error
      if (error instanceof Error) {
        console.error("Error message:", error.message);
        console.error("Error stack:", error.stack);
      } else {
        console.error("Unknown error type:", typeof error);
      }
    } finally {
      setIsLoadingUser(false);
    }
  }, [authenticated, privyUser, getAccessToken]);

  useEffect(() => {
    if (ready) {
      fetchUser();
    }
  }, [ready, authenticated, privyUser, fetchUser]);

  const refreshUser = async () => {
    await fetchUser();
  };

  return (
    <SupabaseContext.Provider
      value={{
        dbUser,
        isLoadingUser,
        refreshUser,
      }}
    >
      {children}
    </SupabaseContext.Provider>
  );
};
