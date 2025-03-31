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
import {
  createOrUpdateUser,
  getUserByWalletAddress,
} from "../lib/services/user-service";

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
  const { user: privyUser, authenticated, ready } = usePrivy();
  const [dbUser, setDbUser] = useState<User | null>(null);
  const [isLoadingUser, setIsLoadingUser] = useState(true);

  const fetchUser = useCallback(async () => {
    if (!authenticated || !privyUser) {
      setDbUser(null);
      setIsLoadingUser(false);
      return;
    }

    try {
      setIsLoadingUser(true);

      // Get Privy DID - this is the user's unique identifier from Privy
      const privyDid = privyUser.id;
      console.log("Privy user DID:", privyDid);

      // Check for wallet address from embedded wallet first
      let walletAddress = privyUser.wallet?.address;

      // If no wallet address is found, try to get it from the wallets
      if (!walletAddress && (privyUser as any).linkedAccounts) {
        const embeddedWallet = (privyUser as any).linkedAccounts.find(
          (account: any) =>
            account.type === "wallet" && account.walletClientType === "privy"
        );

        if (embeddedWallet) {
          walletAddress = embeddedWallet.address;
          console.log(
            "Found embedded wallet address from linkedAccounts:",
            walletAddress
          );
        }
      }

      // Get smart wallet address if available
      let smartWalletAddress: string | undefined = undefined;
      if ((privyUser as any).linkedAccounts) {
        const smartWalletAccount = (privyUser as any).linkedAccounts.find(
          (account: any) => account.type === "smart_wallet"
        );

        if (smartWalletAccount) {
          smartWalletAddress = smartWalletAccount.address;
          console.log(
            "Found smart wallet address from linkedAccounts:",
            smartWalletAddress
          );
        }
      }

      if (!walletAddress) {
        console.log("No wallet address available for user:", privyUser);
        console.log("User details:", JSON.stringify(privyUser, null, 2));
        setIsLoadingUser(false);
        return;
      }

      // Try to get the user from the database
      const user = await getUserByWalletAddress(walletAddress);

      // If the user doesn't exist, create a new one
      if (!user) {
        console.log("Creating new user...");
        const newUser = {
          wallet_address: walletAddress,
          smart_wallet_address: smartWalletAddress,
          privy_did: privyDid,
          name:
            (privyUser as any).twitter?.username ||
            (privyUser as any).name?.first ||
            (privyUser as any).email?.address?.split("@")[0] ||
            "Anonymous",
          email: (privyUser as any).email?.address,
          twitter_username: (privyUser as any).twitter?.username || undefined,
          avatar_url: (privyUser as any).avatar || undefined,
        };

        console.log("New user data:", newUser);
        const createdUser = await createOrUpdateUser(newUser);
        console.log("Created user:", createdUser);
        setDbUser(createdUser);
      } else {
        // Check if we need to update the user with new Privy data
        const updatedFields: Partial<User> = {};
        let needsUpdate = false;

        const privyName = (privyUser as any).name?.first;
        const privyEmail = (privyUser as any).email?.address;
        const privyTwitter = (privyUser as any).twitter?.username;
        const privyAvatar = (privyUser as any).avatar;

        // Add or update Privy DID if it's not set
        if (privyDid && privyDid !== user.privy_did) {
          updatedFields.privy_did = privyDid;
          needsUpdate = true;
          console.log("Updating user with Privy DID:", privyDid);
        }

        // Update smart wallet address if it exists and has changed
        if (
          smartWalletAddress &&
          smartWalletAddress !== user.smart_wallet_address
        ) {
          updatedFields.smart_wallet_address = smartWalletAddress;
          needsUpdate = true;
        }

        // Prioritize Twitter username for the name field
        if (privyTwitter && privyTwitter !== user.name) {
          updatedFields.name = privyTwitter;
          needsUpdate = true;
        } else if (privyName && privyName !== user.name && !privyTwitter) {
          updatedFields.name = privyName;
          needsUpdate = true;
        }

        if (privyEmail && privyEmail !== user.email) {
          updatedFields.email = privyEmail;
          needsUpdate = true;
        }

        if (privyTwitter && privyTwitter !== user.twitter_username) {
          updatedFields.twitter_username = privyTwitter;
          needsUpdate = true;
        }

        if (privyAvatar && privyAvatar !== user.avatar_url) {
          updatedFields.avatar_url = privyAvatar;
          needsUpdate = true;
        }

        if (needsUpdate) {
          console.log("Updating user with new Privy data:", updatedFields);
          const updatedUser = await createOrUpdateUser({
            ...updatedFields,
            id: user.id,
            wallet_address: walletAddress,
          });
          setDbUser(updatedUser);
        } else {
          setDbUser(user);
        }
      }
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
  }, [authenticated, privyUser]);

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
