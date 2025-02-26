"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { supabase, User } from "../lib/supabase";
import {
  createOrUpdateUser,
  getUserByWalletAddress,
} from "../lib/services/user-service";

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

  const fetchUser = async () => {
    if (!authenticated || !privyUser) {
      setDbUser(null);
      setIsLoadingUser(false);
      return;
    }

    try {
      setIsLoadingUser(true);
      const walletAddress = privyUser.wallet?.address;

      if (!walletAddress) {
        console.log("No wallet address available for user:", privyUser);
        setIsLoadingUser(false);
        return;
      }

      console.log("Fetching user with wallet address:", walletAddress);

      // Try to get the user from the database
      let user = await getUserByWalletAddress(walletAddress);
      console.log("User from database:", user);

      // If the user doesn't exist, create a new one
      if (!user) {
        console.log("Creating new user...");
        const newUser = {
          wallet_address: walletAddress,
          name:
            privyUser.name?.first ||
            privyUser.email?.address?.split("@")[0] ||
            "Anonymous",
          email: privyUser.email?.address,
          twitter_username: privyUser.twitter?.username || undefined,
          avatar_url: privyUser.avatar || undefined,
        };

        console.log("New user data:", newUser);
        const createdUser = await createOrUpdateUser(newUser);
        console.log("Created user:", createdUser);
        setDbUser(createdUser);
      } else {
        // Check if we need to update the user with new Privy data
        const updatedFields: Partial<User> = {};
        let needsUpdate = false;

        if (privyUser.name?.first && privyUser.name.first !== user.name) {
          updatedFields.name = privyUser.name.first;
          needsUpdate = true;
        }

        if (
          privyUser.email?.address &&
          privyUser.email.address !== user.email
        ) {
          updatedFields.email = privyUser.email.address;
          needsUpdate = true;
        }

        if (
          privyUser.twitter?.username &&
          privyUser.twitter.username !== user.twitter_username
        ) {
          updatedFields.twitter_username = privyUser.twitter.username;
          needsUpdate = true;
        }

        if (privyUser.avatar && privyUser.avatar !== user.avatar_url) {
          updatedFields.avatar_url = privyUser.avatar;
          needsUpdate = true;
        }

        if (needsUpdate) {
          console.log("Updating user with new Privy data:", updatedFields);
          const updatedUser = await createOrUpdateUser({
            ...updatedFields,
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
  };

  useEffect(() => {
    if (ready) {
      fetchUser();
    }
  }, [ready, authenticated, privyUser]);

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
