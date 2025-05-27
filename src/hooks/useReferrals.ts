import { useState, useCallback } from "react";
import useSWR from "swr";
import { useAuthJwt } from "./useAuthJwt";
import showToast from "@/utils/toast";

export interface ReferralCode {
  id: string;
  code: string;
  created_at: string;
  used_at: string | null;
  used_by_user_id: string | null;
  is_active: boolean;
  used_by_user?: {
    id: string;
    name: string | null;
    avatar_url: string | null;
  } | null;
}

export interface GenerateCodeResponse {
  code: ReferralCode;
  currentCount: number;
  maxCodes: number;
  userLevel: number;
}

export function useReferrals() {
  const { token } = useAuthJwt();
  const [isGenerating, setIsGenerating] = useState(false);

  // Fetch referral codes
  const {
    data: codesData,
    error,
    isLoading,
    mutate,
  } = useSWR(
    token ? ["/api/referrals", token] : null,
    async ([url, authToken]) => {
      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch referral codes");
      }

      const data = await response.json();
      return data;
    },
    {
      refreshInterval: 30000, // Refresh every 30 seconds
      revalidateOnFocus: true,
    }
  );

  // Generate new referral code
  const generateCode = useCallback(async () => {
    if (!token || isGenerating) return null;

    setIsGenerating(true);
    try {
      const response = await fetch("/api/referrals/generate", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.error === "Code limit reached") {
          showToast.error(data.message);
        } else {
          showToast.error(data.error || "Failed to generate code");
        }
        return null;
      }

      // Refresh the codes list
      mutate();

      showToast.success("Referral code generated successfully!");
      return data as GenerateCodeResponse;
    } catch (error) {
      console.error("Error generating referral code:", error);
      showToast.error("Failed to generate referral code");
      return null;
    } finally {
      setIsGenerating(false);
    }
  }, [token, isGenerating, mutate]);

  return {
    codes: codesData?.codes || [],
    isLoading,
    error,
    generateCode,
    isGenerating,
    refreshCodes: mutate,
  };
}
