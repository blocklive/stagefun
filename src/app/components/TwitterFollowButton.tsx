"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useSupabase } from "@/contexts/SupabaseContext";
import { useAuthJwt } from "@/hooks/useAuthJwt";
import { FaTwitter } from "react-icons/fa";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import showToast from "@/utils/toast";

interface TwitterFollowButtonProps {
  onSuccess?: () => void;
  className?: string;
  twitterHandle?: string;
}

export default function TwitterFollowButton({
  onSuccess,
  className = "",
  twitterHandle = "stagedotfun",
}: TwitterFollowButtonProps) {
  const { dbUser } = useSupabase();
  const { token: authToken, refreshToken } = useAuthJwt();
  const [isChecking, setIsChecking] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [hasChecked, setHasChecked] = useState(false);
  const [isPolling, setIsPolling] = useState(false);
  const [pollAttempts, setPollAttempts] = useState(0);
  const [alreadyCompleted, setAlreadyCompleted] = useState(false);

  const MAX_POLL_ATTEMPTS = 3; // Poll 3 times (30 seconds total)
  const POLL_INTERVAL = 10000; // 10 seconds between checks

  // Function to verify follows
  const verifyFollow = useCallback(async () => {
    if (!dbUser?.id || !authToken) {
      return false;
    }

    try {
      // Get a fresh token if needed
      let token = authToken || "";
      if (!token) {
        token = (await refreshToken()) || "";
      }

      if (!token) {
        console.error("No auth token available");
        return false;
      }

      // Call our API endpoint to check if the user is following
      const response = await fetch("/api/twitter/verify-follow", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      const result = await response.json();

      if (!response.ok) {
        console.error(
          "Error verifying follow:",
          result.error || result.message
        );
        return false;
      }

      // If already completed, no need to award points again
      if (result.alreadyCompleted) {
        setAlreadyCompleted(true);
        setIsVerified(true);
        return true;
      }

      // Check if user is following
      if (result.isFollowing) {
        // The verify-follow endpoint now handles awarding points
        setIsVerified(true);
        showToast.success(`Verified! You're following @${twitterHandle}!`);
        if (onSuccess) onSuccess();
        return true;
      }

      return result.isFollowing;
    } catch (error) {
      console.error("Error verifying follow:", error);
      return false;
    }
  }, [dbUser?.id, authToken, refreshToken, twitterHandle, onSuccess]);

  // Initial check when component mounts
  useEffect(() => {
    const checkInitialStatus = async () => {
      if (!hasChecked && dbUser?.id && dbUser?.twitter_username) {
        setIsChecking(true);
        try {
          const isFollowing = await verifyFollow();
          if (isFollowing) {
            setIsVerified(true);
          }
        } catch (error) {
          console.error("Error checking initial follow status:", error);
        } finally {
          setIsChecking(false);
          setHasChecked(true);
        }
      }
    };

    checkInitialStatus();
  }, [dbUser?.id, dbUser?.twitter_username, hasChecked, verifyFollow]);

  // Start polling when user clicks the follow button
  const handleFollowClick = () => {
    // Open Twitter profile in a new tab
    window.open(`https://x.com/${twitterHandle}`, "_blank");

    // Start polling for follow verification
    setIsPolling(true);
    setPollAttempts(0);
  };

  // Polling effect
  useEffect(() => {
    let pollTimer: NodeJS.Timeout;

    const pollForFollowStatus = async () => {
      if (isPolling && pollAttempts < MAX_POLL_ATTEMPTS) {
        setIsChecking(true);

        try {
          const isFollowing = await verifyFollow();

          if (isFollowing) {
            setIsVerified(true);
            setIsPolling(false);
          } else {
            // Increment attempts and continue polling
            setPollAttempts((prev) => prev + 1);
          }
        } catch (error) {
          console.error("Error polling follow status:", error);
        } finally {
          setIsChecking(false);
        }
      } else if (pollAttempts >= MAX_POLL_ATTEMPTS) {
        // Stop polling after max attempts
        setIsPolling(false);
        showToast.error(
          `Couldn't verify that you're following @${twitterHandle}. Please try again.`
        );
      }
    };

    if (isPolling && !isVerified) {
      pollTimer = setTimeout(pollForFollowStatus, POLL_INTERVAL);
    }

    return () => {
      if (pollTimer) clearTimeout(pollTimer);
    };
  }, [isPolling, pollAttempts, isVerified, verifyFollow, twitterHandle]);

  // Check if user has X account linked first
  if (!dbUser?.twitter_username) {
    return (
      <button
        disabled
        className={`flex items-center justify-center gap-2 py-2 px-4 bg-gray-600 text-white rounded-full opacity-75 ${className}`}
      >
        <FaTwitter />
        <span>Link X Account First</span>
      </button>
    );
  }

  // If already verified, show success state
  if (isVerified) {
    return (
      <button
        disabled
        className={`flex items-center justify-center gap-2 py-2 px-4 bg-green-600 text-white rounded-full opacity-75 ${className}`}
      >
        <FaTwitter />
        <span>
          {alreadyCompleted
            ? "Already Following"
            : `Following @${twitterHandle}`}
        </span>
      </button>
    );
  }

  return (
    <button
      onClick={handleFollowClick}
      disabled={isChecking || isPolling}
      className={`flex items-center justify-center gap-2 py-2 px-4 bg-[#1DA1F2] hover:bg-[#1a94df] text-white rounded-full transition-colors ${className}`}
    >
      {isChecking || isPolling ? (
        <>
          <LoadingSpinner color="#FFFFFF" size={16} />
          <span>
            {isPolling
              ? `Verifying (${pollAttempts + 1}/${MAX_POLL_ATTEMPTS})...`
              : "Checking..."}
          </span>
        </>
      ) : (
        <>
          <FaTwitter />
          <span>Follow @{twitterHandle}</span>
        </>
      )}
    </button>
  );
}
