"use client";

import { useEffect } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { setupGlobalPrivyTokenAccess } from "../lib/auth/client";

/**
 * This component initializes the global Privy auth token access
 * It should be included near the top of the component tree
 */
export default function PrivyAuthInitializer() {
  const { getAccessToken, authenticated, ready } = usePrivy();

  // Set up global token access as soon as Privy is ready
  useEffect(() => {
    if (ready) {
      console.log("Setting up global Privy token access");
      setupGlobalPrivyTokenAccess(async () => {
        // Only attempt to get token if authenticated
        if (!authenticated) {
          console.log("User not authenticated, cannot get token");
          return "";
        }

        try {
          const token = await getAccessToken();
          // Ensure we always return a string, never null
          return token || "";
        } catch (error) {
          console.error("Error getting Privy token:", error);
          return "";
        }
      });
    }
  }, [ready, authenticated, getAccessToken]);

  return null; // This is a non-visual component
}
