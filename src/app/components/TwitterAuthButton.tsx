"use client";

import React, { useState } from "react";
import { FaTwitter } from "react-icons/fa";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { useAuthJwt } from "@/hooks/useAuthJwt";
import showToast from "@/utils/toast";

interface TwitterAuthButtonProps {
  onSuccess?: () => void;
  className?: string;
}

export default function TwitterAuthButton({
  onSuccess,
  className = "",
}: TwitterAuthButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { token: authToken, refreshToken } = useAuthJwt();

  const handleTwitterAuth = async () => {
    setIsLoading(true);
    try {
      // Get a fresh token if needed
      let token = authToken;
      if (!token) {
        token = await refreshToken();
      }

      if (!token) {
        throw new Error("No authentication token available");
      }

      // Call our API endpoint to initiate Twitter OAuth flow
      const response = await fetch("/api/twitter/auth", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "Failed to initiate Twitter authentication"
        );
      }

      // Redirect to Twitter OAuth page
      window.location.href = data.authUrl;
    } catch (error) {
      console.error("Error initiating Twitter auth:", error);
      showToast.error("Failed to connect to Twitter. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button
      onClick={handleTwitterAuth}
      disabled={isLoading}
      className={`flex items-center justify-center gap-2 py-2 px-4 bg-[#1DA1F2] hover:bg-[#1a94df] text-white rounded-full transition-colors ${className}`}
    >
      {isLoading ? (
        <>
          <LoadingSpinner color="#FFFFFF" size={16} />
          <span>Connecting...</span>
        </>
      ) : (
        <>
          <FaTwitter />
          <span>Connect with X</span>
        </>
      )}
    </button>
  );
}
