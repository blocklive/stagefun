"use client";

import React, { useState, useEffect } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { useSupabase } from "@/contexts/SupabaseContext";
import { useAuthJwt } from "@/hooks/useAuthJwt";
import { FaXTwitter } from "react-icons/fa6";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import showToast from "@/utils/toast";

interface TwitterLinkButtonProps {
  onSuccess?: () => void;
  className?: string;
}

export default function TwitterLinkButton({
  onSuccess,
  className = "",
}: TwitterLinkButtonProps) {
  const { user: privyUser, linkTwitter } = usePrivy();
  const { dbUser, refreshUser } = useSupabase();
  const { token: authToken, refreshToken } = useAuthJwt();
  const [isLinking, setIsLinking] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);

  // Check if X account is already linked through Privy
  const isLinked = !!privyUser?.twitter?.username;

  // Check if X account is synced with our database
  const isSynced = !!dbUser?.twitter_username;

  useEffect(() => {
    // If the account is linked in Privy but not yet in our database,
    // we need to sync the data
    const syncTwitterData = async () => {
      if (isLinked && !isSynced && !isCompleting) {
        setIsCompleting(true);

        try {
          // Force a refresh of the user data to sync the Twitter username
          await refreshUser();

          // If we have the username synced, try to complete the mission
          if (dbUser?.id && authToken) {
            // Call the API to award points for the mission
            const response = await fetch("/api/points/award-mission", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${authToken}`,
              },
              body: JSON.stringify({ missionId: "link_x" }),
            });

            const result = await response.json();

            if (response.ok) {
              showToast.success(
                `X account linked! +${result.points.toLocaleString()} points`
              );
              if (onSuccess) onSuccess();
            }
          }
        } catch (error) {
          console.error("Error syncing Twitter data:", error);
          showToast.error("Failed to sync X account");
        } finally {
          setIsCompleting(false);
        }
      }
    };

    syncTwitterData();
  }, [
    isLinked,
    isSynced,
    dbUser?.id,
    authToken,
    refreshUser,
    onSuccess,
    isCompleting,
  ]);

  const handleLinkTwitter = async () => {
    setIsLinking(true);
    try {
      await linkTwitter();
      // The account linking is handled by Privy and our useEffect will handle the rest
    } catch (error) {
      console.error("Error linking Twitter:", error);
      showToast.error("Failed to link X account");
    } finally {
      setIsLinking(false);
    }
  };

  // If already linked and synced, show a success state
  if (isLinked && isSynced) {
    return (
      <button
        disabled
        className={`flex items-center justify-center gap-2 py-2 px-4 bg-green-600 text-white rounded-full opacity-75 ${className}`}
      >
        <FaXTwitter />
        <span>X Account Linked</span>
      </button>
    );
  }

  return (
    <button
      onClick={handleLinkTwitter}
      disabled={isLinking || isCompleting}
      className={`flex items-center justify-center gap-2 py-2 px-4 bg-[#1DA1F2] hover:bg-[#1a94df] text-white rounded-full transition-colors ${className}`}
    >
      {isLinking || isCompleting ? (
        <>
          <LoadingSpinner color="#FFFFFF" size={16} />
          <span>{isLinking ? "Connecting..." : "Syncing..."}</span>
        </>
      ) : (
        <>
          <FaXTwitter />
          <span>Link X Account</span>
        </>
      )}
    </button>
  );
}
